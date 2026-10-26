// ==========================================================
// CREDIT-1 — development calibration: the session plan and the analysis of every protocol step (pure; CALIBRATION_PROTOCOL.md)
// ==========================================================
//   planCalibration()           the ordered session list (no seeds): D-0, D-1, D-2 and the cell sessions on development worlds 0-29
//   withConfigs(plan, stream)   adds the configuration and agent seeds of each world from the XFER-1 development stream (re-derived by
//                               the runner with the existing deterministic functions; nothing new is generated here)
//   validatePlan(plan)          scope, delivery, dependencies, protocol coverage and counts
//   d0 .. c2                    one pure function per protocol step over session records; each returns { step, pass, ... }
// The runner (calibrate.mjs) executes sessions and calls these; nothing here runs a session, reads a clock or imports the runtime.
// ==========================================================
import { CELLS, GOALS, EVENT_CLASSES, nFor } from './config.mjs';
import { pi, deliveryFor, cellOf } from './delivery.mjs';
import { CALIBRATION_SCOPE, PROCEDURES, scopeProblems, calibrationRecordProblems, SWAP_PARITY_SCOPE, swapScopeProblems, swapParityRecordProblems } from './lock.mjs';
import { TICKS, trainSeed, testSeed } from '../xfer1/config.mjs';
import { brainHash, componentHashes, VOLATILE_EPISODE_FIELDS } from '../xfer1/brain.mjs';

export const PLAN = Object.freeze({
  worlds: Object.freeze({ lo: 0, hi: 29 }),        // protocol section 1
  quartetWorlds: Object.freeze({ lo: 0, hi: 27 }), // seven quartets: swap cells and the C-1 SDs
  d0World: 0,                                      // D-0: 4 LEARN-0-tree sessions run twice
  d1Worlds: Object.freeze({ lo: 0, hi: 9 }),       // D-1 / D-2: >= 10 worlds
});
export const STEP_ORDER = Object.freeze(['C-0', 'D-0', 'D-1', 'D-1c', 'D-2', 'D-3', 'D-4', 'D-5', 'C-1', 'C-2']);
export const EXPECTED_COUNTS = Object.freeze({ 'D-0': 8, 'D-1': 80, 'D-2': 40, CELLS: 236, total: 364 });
const CORE = ['T_L', 'T_A', 'N0L', 'N1L', 'N0A', 'N1A'];
const range = (r) => Array.from({ length: r.hi - r.lo + 1 }, (_, i) => r.lo + i);

// ---------------- plan ----------------
export function planCalibration() {
  const out = [];
  const add = (e) => out.push(Object.freeze({ seq: out.length + 1, procedure: null, brainFrom: null, export: false, ...e }));
  const w0 = PLAN.d0World;
  for (const rep of [1, 2]) {
    const p = `D0r${rep}`;
    add({ step: 'D-0', driver: 'learn0', label: `${p}-T-w${w0}`, world: w0, role: 'train', arm: null, map: 'off', export: true });
    add({ step: 'D-0', driver: 'learn0', label: `${p}-N0-w${w0}`, world: w0, role: 'test', arm: 'COLD', map: 'off' });
    add({ step: 'D-0', driver: 'learn0', label: `${p}-N1-w${w0}`, world: w0, role: 'test', arm: 'FULL', map: 'off', brainFrom: `${p}-T-w${w0}` });
    add({ step: 'D-0', driver: 'learn0', label: `${p}-O0-w${w0}`, world: w0, role: 'test', arm: 'COLD', map: 'on' });
  }
  const D1 = range(PLAN.d1Worlds);
  for (const w of D1) {
    add({ step: 'D-1', driver: 'learn0', label: `L0-T-w${w}`, world: w, role: 'train', arm: null, map: 'off', export: true });
    add({ step: 'D-1', driver: 'credit1', label: `T_L-w${w}`, world: w, role: 'train', cell: 'T_L', map: 'off', export: true });
  }
  for (const w of D1) {
    add({ step: 'D-1', driver: 'learn0', label: `L0-N0-w${w}`, world: w, role: 'test', arm: 'COLD', map: 'off' });
    add({ step: 'D-1', driver: 'learn0', label: `L0-N1-w${w}`, world: w, role: 'test', arm: 'FULL', map: 'off', brainFrom: `L0-T-w${w}` });
    add({ step: 'D-1', driver: 'learn0', label: `L0-O0-w${w}`, world: w, role: 'test', arm: 'COLD', map: 'on' });
    add({ step: 'D-1', driver: 'credit1', label: `N0L-w${w}`, world: w, role: 'test', cell: 'N0L', map: 'off' });
    add({ step: 'D-1', driver: 'credit1', label: `N1L-w${w}`, world: w, role: 'test', cell: 'N1L', map: 'off', brainFrom: `T_L-w${w}` });
    add({ step: 'D-1', driver: 'credit1', label: `MAPON-N0L-w${w}`, world: w, role: 'test', cell: 'N0L', map: 'on', procedure: 'MAP_ON_PARITY' });
  }
  for (const w of D1) add({ step: 'D-2', driver: 'credit1', label: `D2-T_L-w${w}`, world: w, role: 'train', cell: 'T_L', map: 'off', procedure: 'D2_ALIGNED_FALSE', export: true });
  for (const w of D1) {
    add({ step: 'D-2', driver: 'credit1', label: `D2-N0L-w${w}`, world: w, role: 'test', cell: 'N0L', map: 'off', procedure: 'D2_ALIGNED_FALSE' });
    add({ step: 'D-2', driver: 'credit1', label: `D2-N1L-w${w}`, world: w, role: 'test', cell: 'N1L', map: 'off', procedure: 'D2_ALIGNED_FALSE', brainFrom: `D2-T_L-w${w}` });
    add({ step: 'D-2', driver: 'credit1', label: `D2-MAPON-N0L-w${w}`, world: w, role: 'test', cell: 'N0L', map: 'on', procedure: 'D2_MAP_ON_PARITY' });
  }
  // the cell sessions not already run in D-1 (training first, so every delivered store exists before its test session)
  const inD1 = (w) => w >= PLAN.d1Worlds.lo && w <= PLAN.d1Worlds.hi;
  const W = range(PLAN.worlds), quartet = (w) => w >= PLAN.quartetWorlds.lo && w <= PLAN.quartetWorlds.hi;
  for (const w of W) {
    if (!inD1(w)) add({ step: 'CELLS', driver: 'credit1', label: `T_L-w${w}`, world: w, role: 'train', cell: 'T_L', map: 'off', export: true });
    add({ step: 'CELLS', driver: 'credit1', label: `T_A-w${w}`, world: w, role: 'train', cell: 'T_A', map: 'off', export: true });
  }
  for (const w of W) {
    if (!inD1(w)) {
      add({ step: 'CELLS', driver: 'credit1', label: `N0L-w${w}`, world: w, role: 'test', cell: 'N0L', map: 'off' });
      add({ step: 'CELLS', driver: 'credit1', label: `N1L-w${w}`, world: w, role: 'test', cell: 'N1L', map: 'off', brainFrom: `T_L-w${w}` });
    }
    add({ step: 'CELLS', driver: 'credit1', label: `N0A-w${w}`, world: w, role: 'test', cell: 'N0A', map: 'off' });
    add({ step: 'CELLS', driver: 'credit1', label: `N1A-w${w}`, world: w, role: 'test', cell: 'N1A', map: 'off', brainFrom: `T_A-w${w}` });
    add({ step: 'CELLS', driver: 'credit1', label: `N1A_noQ-w${w}`, world: w, role: 'test', cell: 'N1A_noQ', map: 'off', brainFrom: `T_A-w${w}` });
    if (quartet(w)) {
      add({ step: 'CELLS', driver: 'credit1', label: `N1AX-w${w}`, world: w, role: 'test', cell: 'N1AX', map: 'off', brainFrom: `T_A-w${pi(w)}` });
      add({ step: 'CELLS', driver: 'credit1', label: `N1LX-w${w}`, world: w, role: 'test', cell: 'N1LX', map: 'off', brainFrom: `T_L-w${pi(w)}` });
    }
  }
  return Object.freeze(out);
}

/** stream: XFER-1 development stream entries [{ acceptedSeed, acceptedConfigIndex, goal }] for worlds 0..29 */
export function withConfigs(plan, stream) {
  const by = new Map(plan.map(e => [e.label, e]));
  return Object.freeze(plan.map(e => {
    const s = stream[e.world];
    if (!s || s.acceptedConfigIndex !== e.world) throw new Error(`CREDIT-1 calibration: no development configuration for world ${e.world}`);
    const src = e.brainFrom ? by.get(e.brainFrom) : null;
    // a swap-parity own-path copy is declared through the own-store path (brainWorld = its own world)
    return Object.freeze({ ...e, configSeed: s.acceptedSeed, configIndex: s.acceptedConfigIndex, goal: s.goal,
      agentSeed: e.role === 'train' ? trainSeed(e.world) : testSeed(e.world), ticks: TICKS[e.role], brainWorld: src ? (e.copyAs ? e.world : src.world) : null });
  }));
}

/** the exact driver input of one entry; paths: { tree: { learn0, credit1 }, brain(label) } */
export function driverInput(e, paths) {
  const base = { role: e.role, label: e.label, world: e.world, configSeed: e.configSeed, configIndex: e.configIndex, agentSeed: e.agentSeed, ticks: e.ticks, map: e.map, instrument: true, cond: 'P' };
  const store = e.brainFrom ? { brainPath: paths.brain(e.copyAs || e.brainFrom), brainWorld: e.brainWorld } : {};
  const exp = e.export ? { exportPath: paths.brain(e.label) } : {};
  if (e.driver === 'learn0') return { ...base, tree: paths.tree.learn0, ...(e.arm ? { arm: e.arm } : {}), ...store, ...exp };
  return { ...base, tree: paths.tree.credit1, cell: e.cell, ledger: 'full', ...(e.procedure ? { procedure: e.procedure } : {}),
    ...(Number.isInteger(e.storeSourceWorld) ? { storeSourceWorld: e.storeSourceWorld } : {}), ...store, ...exp };
}

export function validatePlan(plan, { pairing = pi, aPlus = false } = {}) {
  const problems = [];
  const by = new Map();
  plan.forEach((e, i) => { if (e.seq !== i + 1) problems.push(`entry ${i + 1}: sequence number ${e.seq}`); if (by.has(e.label)) problems.push(`duplicate label ${e.label}`); by.set(e.label, e); });
  const counts = {};
  for (const e of plan) {
    counts[e.step] = (counts[e.step] || 0) + 1;
    if (!Number.isInteger(e.world) || e.world < PLAN.worlds.lo || e.world > PLAN.worlds.hi) problems.push(`${e.label}: world ${e.world} is outside development worlds ${PLAN.worlds.lo}-${PLAN.worlds.hi}`);
    if (e.world >= 2032) problems.push(`${e.label}: confirmatory territory`);
    if (e.driver === 'credit1') {
      const sp = scopeProblems(CALIBRATION_SCOPE, { world: e.world, cell: e.cell, procedure: e.procedure === null ? undefined : e.procedure });
      if (sp.length) problems.push(`${e.label}: ${sp[0]}`);
      let c; try { c = cellOf(e.cell); } catch { problems.push(`${e.label}: unknown cell ${e.cell}`); continue; }
      if (!aPlus && c.credit === 'A+') problems.push(`${e.label}: A+ cell`);
      if (c.role !== e.role) problems.push(`${e.label}: role ${e.role} on a ${c.role} cell`);
      const proc = e.procedure ? PROCEDURES[e.procedure] : null;
      if (e.map !== (proc && proc.mapOn ? 'on' : c.map)) problems.push(`${e.label}: map ${e.map}`);
      const d = deliveryFor(e.cell, e.world);
      if (d.source === 'none') { if (e.brainFrom) problems.push(`${e.label}: a cold cell has a store`); }
      else {
        const src = by.get(e.brainFrom);
        if (!src || src.seq >= e.seq) problems.push(`${e.label}: its store ${e.brainFrom} is not exported earlier`);
        else {
          if (src.driver !== 'credit1' || src.cell !== d.training || !src.export) problems.push(`${e.label}: store from ${src.label}, expected a ${d.training} export`);
          if (src.world !== (d.source === 'own' ? e.world : pairing(e.world))) problems.push(`${e.label}: store of world ${src.world}, expected ${d.source === 'own' ? e.world : pairing(e.world)}`);
          if ((src.procedure === null) !== (e.procedure === null)) problems.push(`${e.label}: a development-procedure store must feed exactly the same procedure`);
        }
      }
      if (['N1AX', 'N1LX'].includes(e.cell) && (e.world > PLAN.quartetWorlds.hi || pairing(e.world) > PLAN.quartetWorlds.hi)) problems.push(`${e.label}: swap cell outside the complete quartets`);
    } else if (e.driver === 'learn0') {
      if (e.role === 'train' ? (e.arm !== null || e.map !== 'off') : !['COLD', 'FULL'].includes(e.arm)) problems.push(`${e.label}: LEARN-0 procedure`);
      if (e.arm === 'FULL') { const src = by.get(e.brainFrom); if (!src || src.seq >= e.seq || src.driver !== 'learn0' || src.world !== e.world || !src.export) problems.push(`${e.label}: LEARN-0 store`); }
      else if (e.brainFrom) problems.push(`${e.label}: a cold LEARN-0 session has a store`);
    } else problems.push(`${e.label}: unknown driver ${e.driver}`);
  }
  for (const [k, n] of Object.entries(EXPECTED_COUNTS)) if (k !== 'total' && (counts[k] || 0) !== n) problems.push(`step ${k}: ${counts[k] || 0} sessions, expected ${n}`);
  if (plan.length !== EXPECTED_COUNTS.total) problems.push(`${plan.length} sessions, expected ${EXPECTED_COUNTS.total}`);
  // protocol coverage: every design cell on every world exactly once (swap cells on the quartet worlds only), outside the procedures
  const design = plan.filter(e => e.driver === 'credit1' && e.procedure === null);
  for (const w of range(PLAN.worlds)) for (const c of CELLS.map(x => x.name)) {
    const want = CORE.includes(c) || c === 'N1A_noQ' || w <= PLAN.quartetWorlds.hi ? 1 : 0;
    const got = design.filter(e => e.world === w && e.cell === c).length;
    if (got !== want) problems.push(`world ${w} cell ${c}: ${got} sessions, expected ${want}`);
  }
  return problems;
}

/**
 * the git-ignored data directory holds only authorized development runs (gate G8.1).  files: [{ rel, json }] relative to
 * experiments/credit1/data ('/'-separated; json parsed for summary and session files, else null); tracked: git-tracked paths under
 * the data directory; headCarriesLock(head, kind): the commit recorded by a run carries that kind's lock.  A run is a directory
 * <run>/ with summary.json, sessions/<label>.json, brains/<label>.json and logs/<file>.  Two kinds, each checked against its own
 * scope, plan and lock: a development calibration (calibration-only lock) and a swap-parity check (swap-parity lock).  Its summary
 * must record its lock, its commit must carry it, and every record must be a planned, in-scope session of that kind.  Anything
 * else fails.
 */
const RUN_FILE = /^([^/]+)\/(summary\.json|sessions\/[^/]+\.json|brains\/[^/]+\.json|logs\/[^/]+)$/;
export const RUN_KINDS = Object.freeze({
  'credit1/1.calibration': Object.freeze({ lock: 'calibration', scope: CALIBRATION_SCOPE, recordProblems: (a) => calibrationRecordProblems(a), plan: () => planCalibration() }),
  'credit1/1.swap-parity': Object.freeze({ lock: 'swap-parity', scope: SWAP_PARITY_SCOPE, recordProblems: (a) => swapParityRecordProblems(a), plan: () => planSwapParity() }),
});
export function dataDirProblems({ files, tracked, headCarriesLock }) {
  const problems = [];
  const trackedRecords = tracked.filter(t => t !== 'experiments/credit1/data/.gitignore');
  if (trackedRecords.length) problems.push(`tracked calibration file(s): ${trackedRecords.slice(0, 3).join(', ')}`);
  const runs = new Map();
  for (const f of files) {
    if (f.rel === '.gitignore') continue;
    const m = RUN_FILE.exec(f.rel);
    if (!m) { problems.push(`stray file ${f.rel}`); continue; }
    if (!runs.has(m[1])) runs.set(m[1], []);
    runs.get(m[1]).push({ ...f, kind: m[2] });
  }
  let records = 0;
  for (const [run, list] of runs) {
    const s = list.find(x => x.kind === 'summary.json');
    const K = s && s.json ? RUN_KINDS[s.json.schema] : null;
    if (!K) { problems.push(`${run}: no calibration summary (records outside an authorized run)`); continue; }
    const planned = new Map(K.plan().map(e => [e.label, e]));
    const copies = new Set(K.plan().filter(e => e.copyAs).map(e => e.copyAs));
    const a = s.json.authorization;
    if (K.recordProblems(a).length || a.authorizedBy !== 'owner') problems.push(`${run}: the summary does not record the ${K.lock} lock`);
    if (!headCarriesLock(s.json.head, K.lock)) problems.push(`${run}: its commit ${String(s.json.head).slice(0, 7)} does not carry the ${K.lock} lock`);
    for (const x of list) {
      if (x.kind.startsWith('sessions/')) {
        records++;
        const label = x.kind.slice('sessions/'.length, -'.json'.length), e = planned.get(label), r = x.json;
        if (!e) { problems.push(`${run}: ${label} is not a planned session`); continue; }
        const isCredit1 = !!r && String(r.schema).startsWith('credit1/');
        if (!r || r.label !== label || !r.input || r.input.world !== e.world || (e.driver === 'credit1') !== isCredit1
          || (isCredit1 && (r.cell !== e.cell || !K.scope.cells.includes(r.cell)))) problems.push(`${run}: ${label} does not match its planned, in-scope session`);
      } else if (x.kind.startsWith('brains/')) {
        const label = x.kind.slice('brains/'.length, -'.json'.length), e = planned.get(label);
        if (!(e && e.export) && !copies.has(label)) problems.push(`${run}: ${label} is not a planned export`);
      }
    }
  }
  return { problems, runs: runs.size, records };
}

/** D-5 pre-check on the stream: worlds whose goal is not GOALS[w mod 4] */
export const goalMismatches = (stream) => stream.map((s, w) => ({ w, goal: s.goal, want: GOALS[w % 4] })).filter(x => x.goal !== x.want);

// ---------------- analysis helpers ----------------
const getPath = (o, p) => p.split('.').reduce((v, k) => (v === undefined || v === null ? undefined : v[k]), o);
const canon = (v) => (Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v);
export function diffPaths(a, b, prefix = '', out = []) {
  if (out.length >= 20) return out;
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    for (const k of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) diffPaths(a[k], b[k], prefix ? `${prefix}.${k}` : k, out);
  } else if (JSON.stringify(canon(a)) !== JSON.stringify(canon(b))) out.push(prefix || '(root)');
  return out;
}
const without = (rec, paths) => { const c = JSON.parse(JSON.stringify(rec)); for (const p of paths) { const ks = p.split('.'); const last = ks.pop(); const o = ks.reduce((v, k) => (v && typeof v === 'object' ? v[k] : undefined), c); if (o && typeof o === 'object') delete o[last]; } return c; };

// D-1 compared fields (DESIGN r2 section 4: fingerprint, writesSha256, end-brain and component hashes, reach call lists, move counters,
// guard and oracle counters, condition integrity), recorded under the same names by both drivers; a superset is compared
export const PARITY_FIELDS = Object.freeze(['role', 'map', 'input.world', 'input.configSeed', 'input.configIndex', 'input.goal', 'input.agentSeed', 'input.ticks',
  'outcome', 'counters', 'reaches', 'endpoints', 'brain.deliveredHash', 'brain.deliveredHashes', 'brain.deliveredSizes', 'brain.start', 'brain.endHash', 'brain.endHashes',
  'brain.endSizes', 'brain.localStorageReads', 'brain.goalKeyedQ', 'conditionIntegrity', 'mapAudit', 'guard', 'moveClass', 'moves', 'diag', 'audit', 'diagnostics', 'artifacts']);
export const parityView = (rec) => Object.fromEntries(PARITY_FIELDS.map(f => [f, getPath(rec, f)]));
export function compareParity(learn0Rec, credit1Rec) {
  const missing = PARITY_FIELDS.filter(f => getPath(learn0Rec, f) === undefined || getPath(credit1Rec, f) === undefined);
  return [...missing.map(f => `missing ${f}`), ...diffPaths(parityView(learn0Rec), parityView(credit1Rec))];
}
const sessionOk = (r) => !!r && r.outcome && r.outcome.completed === true && r.outcome.crashed !== true && r.conditionIntegrity && r.conditionIntegrity.ok === true && r.mapAudit && r.mapAudit.ok === true;
/** a session record is usable: completed, not crashed, condition integrity and the map audit hold */
export const sessionProblems = (r) => (sessionOk(r) ? [] : [`${r && r.label}: ${!r ? 'no record' : !r.outcome || r.outcome.completed !== true || r.outcome.crashed ? 'incomplete or crashed' : r.conditionIntegrity && r.conditionIntegrity.ok !== true ? 'condition integrity' : 'map audit'}`]);

export function d0Pairs() { const w = PLAN.d0World; return ['T', 'N0', 'N1', 'O0'].map(x => [`D0r1-${x}-w${w}`, `D0r2-${x}-w${w}`]); }
export function d1Pairs() { return range(PLAN.d1Worlds).flatMap(w => [[`L0-T-w${w}`, `T_L-w${w}`], [`L0-N0-w${w}`, `N0L-w${w}`], [`L0-N1-w${w}`, `N1L-w${w}`], [`L0-O0-w${w}`, `MAPON-N0L-w${w}`]]); }
export function d2Pairs() { return range(PLAN.d1Worlds).flatMap(w => [[`T_L-w${w}`, `D2-T_L-w${w}`], [`N0L-w${w}`, `D2-N0L-w${w}`], [`N1L-w${w}`, `D2-N1L-w${w}`], [`MAPON-N0L-w${w}`, `D2-MAPON-N0L-w${w}`]]); }

// every differing leaf path (uncapped)
function leafDiffs(a, b, prefix = '', out = []) {
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) leafDiffs(a[k], b[k], prefix ? `${prefix}.${k}` : k, out);
  } else if (JSON.stringify(a) !== JSON.stringify(b)) out.push(prefix || '(root)');
  return out;
}
/**
 * two exported stores of the same session run twice.  The runtime stamps every episode with wall-clock identifiers, so the
 * comparison follows the XFER-1 hash view (xfer1/brain.mjs VOLATILE_EPISODE_FIELDS: id, timestamp): the store hash and every
 * component hash must be equal, and the raw exports (canonical JSON bytes) may differ ONLY in episodes[*].id and
 * episodes[*].timestamp.  Any other difference fails.
 */
export function exportProblems(rawA, rawB) {
  if (typeof rawA !== 'string' || typeof rawB !== 'string') return ['missing export'];
  let A, B;
  try { A = JSON.parse(rawA); B = JSON.parse(rawB); } catch { return ['an export is not valid JSON']; }
  const p = [];
  if (JSON.stringify(A) !== rawA || JSON.stringify(B) !== rawB) p.push('an export is not in canonical JSON form');
  if (brainHash(A) !== brainHash(B)) p.push('the store hash (XFER-1 hash view) differs');
  if (JSON.stringify(componentHashes(A)) !== JSON.stringify(componentHashes(B))) p.push('a component hash differs');
  const volatile = new RegExp(`^episodes\\.\\d+\\.(${VOLATILE_EPISODE_FIELDS.join('|')})$`);
  const other = leafDiffs(A, B).filter(x => !volatile.test(x));
  if (other.length) p.push(`the raw exports differ outside the volatile episode fields: ${other.slice(0, 5).join(', ')}${other.length > 5 ? ` (+${other.length - 5})` : ''}`);
  return p;
}

// ---------------- protocol steps ----------------
/**
 * D-0: the same LEARN-0-tree session run twice is identical: the whole record except its label and store file name; and the two
 * training exports compare equal under exportProblems.  exports: { label: raw export text }
 */
export function d0(recs, exports = {}) {
  const fails = [];
  for (const [a, b] of d0Pairs()) {
    const d = diffPaths(canon(without(recs[a], ['label', 'input.brainFile'])), canon(without(recs[b], ['label', 'input.brainFile'])));
    if (!recs[a] || !recs[b]) fails.push({ pair: [a, b], diffs: ['missing record'] }); else if (d.length) fails.push({ pair: [a, b], diffs: d });
  }
  const [ta, tb] = d0Pairs()[0];
  const ep = exportProblems(exports[ta], exports[tb]);
  if (ep.length) fails.push({ pair: [ta, tb], diffs: ep });
  let volatileDiffs = null;
  try { volatileDiffs = leafDiffs(JSON.parse(exports[ta]), JSON.parse(exports[tb])).length; } catch { volatileDiffs = null; }
  return { step: 'D-0', pass: fails.length === 0, pairs: d0Pairs().length, exportVolatileDiffs: ep.length ? null : volatileDiffs, fails };
}
/** D-1: the CREDIT-1 tree with the global absent is identical to the LEARN-0 tree on every compared field */
export function d1(recs) {
  const fails = [];
  for (const [l0, c1] of d1Pairs()) { const d = !recs[l0] || !recs[c1] ? ['missing record'] : compareParity(recs[l0], recs[c1]); if (d.length) fails.push({ pair: [l0, c1], diffs: d }); }
  return { step: 'D-1', pass: fails.length === 0, pairs: d1Pairs().length, fails };
}
/** D-1c: coverage of the D-1 CREDIT-1 sessions */
export function d1c(recs, { aPlus = false } = {}) {
  const set = d1Pairs().map(([, c1]) => recs[c1]).filter(Boolean);
  const total = Object.fromEntries(EVENT_CLASSES.map(c => [c, 0]));
  const unknown = new Set();
  for (const r of set) for (const c of EVENT_CLASSES) { const v = r.credit1 && r.credit1.eventClasses ? r.credit1.eventClasses.counts[c] : null; if (v === null || v === undefined) unknown.add(c); else total[c] += v; }
  const required = EVENT_CLASSES.filter(c => aPlus || !c.startsWith('aplus_'));
  const dims = { mapOn: set.some(r => r.map === 'on'), mapOff: set.some(r => r.map === 'off'), stored: set.some(r => r.input.delivery.source !== 'none'), cold: set.some(r => r.input.delivery.source === 'none'),
    training: set.some(r => r.role === 'train'), test: set.some(r => r.role === 'test') };
  const missing = [...required.filter(c => !(total[c] >= 1)), ...Object.entries(dims).filter(([, v]) => !v).map(([k]) => k)];
  return { step: 'D-1c', pass: set.length === d1Pairs().length && missing.length === 0 && required.every(c => !unknown.has(c)), sessions: set.length, counts: total, dims, missing, unknown: [...unknown] };
}
/** D-2: { aligned: false } with telemetry and ledger installed is identical to the D-1 CREDIT-1 session (whole record except label, procedure, store file name) */
export function d2(recs) {
  const strip = ['label', 'procedure', 'input.delivery.brainFile'];
  const fails = [];
  for (const [a, b] of d2Pairs()) { const d = !recs[a] || !recs[b] ? ['missing record'] : diffPaths(canon(without(recs[a], strip)), canon(without(recs[b], strip))); if (d.length) fails.push({ pair: [a, b], diffs: d }); }
  return { step: 'D-2', pass: fails.length === 0, pairs: d2Pairs().length, fails };
}
const credit1Recs = (recs) => Object.values(recs).filter(r => r && typeof r.schema === 'string' && r.schema.startsWith('credit1/'));
/** D-3: I-CRED and I-LEDGER PASS in every A cell; DISCRIMINATING and LEGACY_PATTERN in every L training session; no FAIL anywhere */
export function d3(recs) {
  const fails = [];
  for (const r of credit1Recs(recs)) {
    const ic = r.credit1.icred.verdict, lg = r.credit1.ledger.verdict;
    if (ic === 'FAIL' || lg === 'FAIL') fails.push({ label: r.label, why: `instrument FAIL (I-CRED ${ic}, I-LEDGER ${lg})` });
    else if (r.credit === 'A' && (ic !== 'PASS' || lg !== 'PASS')) fails.push({ label: r.label, why: `A cell: I-CRED ${ic}, I-LEDGER ${lg}` });
    else if (r.credit === 'L' && r.role === 'train' && (ic !== 'DISCRIMINATING' || lg !== 'LEGACY_PATTERN')) fails.push({ label: r.label, why: `L training: I-CRED ${ic}, I-LEDGER ${lg}` });
  }
  return { step: 'D-3', pass: fails.length === 0, sessions: credit1Recs(recs).length, fails };
}
/** D-4: the goal-redirect counters (survival, recovery) are 0 in every cell */
export function d4(recs) {
  const fails = credit1Recs(recs).filter(r => !r.credit1.redirects || r.credit1.redirects.survival !== 0 || r.credit1.redirects.recovery !== 0).map(r => ({ label: r.label, redirects: r.credit1.redirects }));
  return { step: 'D-4', pass: fails.length === 0, sessions: credit1Recs(recs).length, fails };
}
/** D-5: each development world's goal, as recorded by its sessions, equals GOALS[w mod 4] */
export function d5(recs) {
  const goals = {};
  for (const r of Object.values(recs)) { if (!r || !r.input) continue; (goals[r.input.world] ||= new Set()).add(r.input.goal); }
  const fails = Object.entries(goals).filter(([w, s]) => s.size !== 1 || [...s][0] !== GOALS[Number(w) % 4]).map(([w, s]) => ({ world: Number(w), recorded: [...s], expected: GOALS[Number(w) % 4] }));
  return { step: 'D-5', pass: fails.length === 0 && Object.keys(goals).length === PLAN.worlds.hi - PLAN.worlds.lo + 1, worlds: Object.keys(goals).length, fails };
}
const sampleSd = (xs) => { const m = xs.reduce((s, x) => s + x, 0) / xs.length; return { mean: m, sd: Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)) }; };
/** C-1: SDs of P1 = N1A - N0A and of P2 = (N1A - N0A) - (N1L - N0L) (estimated directly), over the 28 quartet worlds; n by config.nFor */
export function c1(recs) {
  const W = range(PLAN.quartetWorlds), rows = [], missing = [];
  for (const w of W) {
    const v = Object.fromEntries(['N1A', 'N0A', 'N1L', 'N0L'].map(c => [c, recs[`${c}-w${w}`] ? recs[`${c}-w${w}`].reaches.legal : undefined]));
    if (Object.values(v).some(x => !Number.isFinite(x))) { missing.push(w); continue; }
    rows.push({ w, P1: v.N1A - v.N0A, P2: (v.N1A - v.N0A) - (v.N1L - v.N0L) });
  }
  if (missing.length || rows.length < 2) return { step: 'C-1', pass: false, missing, worlds: rows.length };
  const p1 = sampleSd(rows.map(r => r.P1)), p2 = sampleSd(rows.map(r => r.P2));
  const nP1 = nFor(p1.sd), nP2 = nFor(p2.sd);
  return { step: 'C-1', pass: Number.isFinite(p1.sd) && Number.isFinite(p2.sd), worlds: rows.length, P1: { sd: p1.sd, n: nP1 }, P2: { sd: p2.sd, n: nP2 }, n: Math.max(nP1, nP2), rows };
}
/** C-2: descriptive rates (no pass rule beyond being computable) */
export function c2(recs, { sessionsPerMinute = null } = {}) {
  const R = credit1Recs(recs).filter(r => r.procedure === null), sum = (xs) => xs.reduce((s, x) => s + x, 0);   // design cells only (D-2 repeats D-1)
  const byArm = (arm) => R.filter(r => r.credit === arm);
  const self = (arm) => { const o = {}; for (const r of byArm(arm)) for (const [site, c] of Object.entries(r.credit1.selfCandidates || {})) { o[site] ||= { evaluations: 0, self: 0 }; o[site].evaluations += c.evaluations; o[site].self += c.self; }
    return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { ...v, rate: v.evaluations ? v.self / v.evaluations : null }])); };
  const ratio = (num, den) => (den ? num / den : null);
  const out = { step: 'C-2', pass: true, rates: {} };
  for (const arm of ['L', 'A']) {
    const rs = byArm(arm), ev = sum(rs.map(r => r.credit1.eventClasses.creditEvents));
    out.rates[arm] = { sessions: rs.length, creditEvents: ev, selfTarget: self(arm),
      carriedShare: ratio(sum(rs.map(r => r.credit1.icred.carried)), sum(rs.map(r => r.credit1.icred.events))),
      fallbackShare: ratio(sum(rs.map(r => r.credit1.eventClasses.counts.fallback_branch)), ev),
      edgeFilterFiring: ratio(sum(rs.map(r => r.credit1.eventClasses.legacyEdge)), sum(rs.map(r => r.credit1.eventClasses.informative))) };
  }
  out.rates.edgeFilterFiringUnderL = out.rates.L.edgeFilterFiring;      // F12's uniform-walk figure is 7.3 %
  out.rates.sessionsPerMinute = sessionsPerMinute;
  out.pass = Object.values(out.rates.L).every(v => v !== undefined) && out.rates.L.sessions > 0;
  return out;
}

// ---------------- swap-parity check (development only; Gemini round 3, HIGH; runs only under SWAP_PARITY_AUTHORIZATION) ----------------
// Question: does delivering the training export of world pi(w) through the swapped-store path (N1AX / N1LX, brainWorld = pi(w))
// behave exactly like delivering a byte copy of the same export through the normal own-store path (N1A / N1L under
// SWAP_PARITY_OWNPATH, brainWorld = w)?  Same world w, seeds, tree, credit mode and mask; only the delivery path differs.
// It establishes delivery-path equivalence, nothing about whether alignment improves learning.
export const SWAP_PLAN = Object.freeze({ worlds: Object.freeze({ lo: 0, hi: 9 }) });
export const SWAP_EXPECTED = Object.freeze({ train: 20, swap: 20, own: 20, total: 60 });
const SWAP_ARMS = Object.freeze([['A', 'T_A', 'N1AX', 'N1A'], ['L', 'T_L', 'N1LX', 'N1L']]);
// the only fields a swap session and its own-path partner may differ in (everything else, the credit1 block included, must be equal)
export const SWAP_ALLOWED_DIFFS = Object.freeze(['label', 'cell', 'procedure', 'input.delivery.source', 'input.delivery.brainWorld', 'input.delivery.brainFile', 'input.delivery.storeSourceWorld']);
export const SWAP_CREDIT1_BLOCKS = Object.freeze(['telemetry', 'icred', 'ledger', 'eventClasses', 'episodes', 'redirects', 'selfCandidates']);

export function planSwapParity() {
  const out = [];
  const add = (e) => out.push(Object.freeze({ seq: out.length + 1, step: 'SWAP', driver: 'credit1', map: 'off', procedure: null, brainFrom: null, export: false, copyAs: null, storeSourceWorld: null, ...e }));
  const W = range(SWAP_PLAN.worlds), sources = [...new Set(W.map(pi))].sort((a, b) => a - b);
  for (const [, T] of SWAP_ARMS) for (const s of sources) add({ label: `${T}-w${s}`, world: s, role: 'train', cell: T, export: true });
  for (const w of W) for (const [, T, X, O] of SWAP_ARMS) {
    add({ label: `${X}-w${w}`, world: w, role: 'test', cell: X, brainFrom: `${T}-w${pi(w)}` });
    add({ label: `${O}-OWN-w${w}`, world: w, role: 'test', cell: O, procedure: 'SWAP_PARITY_OWNPATH', brainFrom: `${T}-w${pi(w)}`, copyAs: `COPY-${T}-w${pi(w)}-for-w${w}`, storeSourceWorld: pi(w) });
  }
  return Object.freeze(out);
}
/** [swap label, own-path label, source export label, copy label, arm] per world and arm */
export const swapPairs = () => range(SWAP_PLAN.worlds).flatMap(w => SWAP_ARMS.map(([arm, T, X, O]) => [`${X}-w${w}`, `${O}-OWN-w${w}`, `${T}-w${pi(w)}`, `COPY-${T}-w${pi(w)}-for-w${w}`, arm]));

export function validateSwapPlan(plan, { pairing = pi } = {}) {
  const problems = [], by = new Map();
  plan.forEach((e, i) => { if (e.seq !== i + 1) problems.push(`entry ${i + 1}: sequence number ${e.seq}`); if (by.has(e.label)) problems.push(`duplicate label ${e.label}`); by.set(e.label, e); });
  const copies = new Set();
  for (const e of plan) {
    if (e.driver !== 'credit1') problems.push(`${e.label}: driver ${e.driver}`);
    if (!Number.isInteger(e.world) || e.world < SWAP_PARITY_SCOPE.worlds.lo || e.world > SWAP_PARITY_SCOPE.worlds.hi) problems.push(`${e.label}: world ${e.world} is outside the swap-parity worlds`);
    if (!SWAP_PARITY_SCOPE.cells.includes(e.cell)) problems.push(`${e.label}: cell ${e.cell} is not in the swap-parity scope`);
    let c; try { c = cellOf(e.cell); } catch { problems.push(`${e.label}: unknown cell ${e.cell}`); continue; }
    if (c.role !== e.role || e.map !== 'off') problems.push(`${e.label}: role or map`);
    const d = deliveryFor(e.cell, e.world), src = e.brainFrom ? by.get(e.brainFrom) : null;
    if (e.procedure === 'SWAP_PARITY_OWNPATH') {
      const sp = swapScopeProblems(SWAP_PARITY_SCOPE, { world: e.world, cell: e.cell, procedure: e.procedure });
      if (sp.length) problems.push(`${e.label}: ${sp[0]}`);
      if (d.source !== 'own') problems.push(`${e.label}: the own-path procedure on a ${d.source} cell`);
      if (e.storeSourceWorld !== pairing(e.world)) problems.push(`${e.label}: storeSourceWorld ${e.storeSourceWorld}, expected ${pairing(e.world)}`);
      if (typeof e.copyAs !== 'string' || !e.copyAs.startsWith('COPY-') || copies.has(e.copyAs) || by.has(e.copyAs)) problems.push(`${e.label}: the own-path session needs its own byte copy`);
      copies.add(e.copyAs);
    } else {
      if (e.procedure !== null || e.copyAs !== null || e.storeSourceWorld !== null) problems.push(`${e.label}: procedure, copy or source world outside the own-path procedure`);
      const sp = scopeProblems(CALIBRATION_SCOPE, { world: e.world, cell: e.cell });
      if (sp.length) problems.push(`${e.label}: ${sp[0]}`);
    }
    if (d.source === 'none') { if (e.brainFrom) problems.push(`${e.label}: a cold cell has a store`); }
    else if (!src || src.seq >= e.seq || !src.export || src.cell !== d.training || src.world !== pairing(e.world)) problems.push(`${e.label}: its store must be the ${d.training} export of world ${pairing(e.world)}, exported earlier`);
  }
  for (const [x, o] of swapPairs()) if (!by.has(x) || !by.has(o)) problems.push(`missing pair ${x} / ${o}`);
  const n = (f) => plan.filter(f).length;
  if (n(e => e.role === 'train') !== SWAP_EXPECTED.train || n(e => ['N1AX', 'N1LX'].includes(e.cell)) !== SWAP_EXPECTED.swap || n(e => e.procedure === 'SWAP_PARITY_OWNPATH') !== SWAP_EXPECTED.own || plan.length !== SWAP_EXPECTED.total)
    problems.push(`counts: ${plan.length} sessions, expected ${SWAP_EXPECTED.total} (20 training, 20 swapped, 20 own-path)`);
  return problems;
}

/**
 * the swap-parity verdict.  recs: label -> session record; evidence: { fileSha: label -> sha256 of the store file (source exports
 * and copies), expectedDeliveredHash: source label -> brainHash(maskStore(export, FULL)) } computed by the runner from the files.
 * Per pair: both sessions valid; I-CRED / I-LEDGER PASS in A pairs and no FAIL in L pairs; the copy byte-identical to its source;
 * the recorded delivery paths as planned; delivered hashes equal to each other and to the expected masked-store hash; every D-1
 * field and every credit1 block present; and the two records equal everywhere except SWAP_ALLOWED_DIFFS.
 */
export function swapParity(recs, evidence = {}, { pairs = swapPairs() } = {}) {
  const fails = [], fileSha = evidence.fileSha || {}, expected = evidence.expectedDeliveredHash || {};
  for (const [x, o, src, copy, arm] of pairs) {
    const why = [], R = recs[x], O = recs[o];
    if (!R || !O) { fails.push({ pair: [x, o], why: ['missing record'] }); continue; }
    for (const r of [R, O]) why.push(...sessionProblems(r));
    for (const r of [R, O]) {
      const ic = r.credit1 && r.credit1.icred && r.credit1.icred.verdict, lg = r.credit1 && r.credit1.ledger && r.credit1.ledger.verdict;
      if (arm === 'A' ? (ic !== 'PASS' || lg !== 'PASS') : (!ic || !lg || ic === 'FAIL' || lg === 'FAIL')) why.push(`${r.label}: I-CRED ${ic}, I-LEDGER ${lg}`);
      const missing = [...PARITY_FIELDS.filter(f => getPath(r, f) === undefined), ...SWAP_CREDIT1_BLOCKS.filter(b => !r.credit1 || r.credit1[b] === undefined)];
      if (!r.credit1 || !r.credit1.ledger || !r.credit1.ledger.pipelineEvidence) missing.push('credit1.ledger.pipelineEvidence');
      if (missing.length) why.push(`${r.label}: missing ${missing.slice(0, 3).join(', ')}`);
    }
    if (!fileSha[src] || !fileSha[copy]) why.push('missing store-file hash evidence');
    else if (fileSha[src] !== fileSha[copy]) why.push('the copy is not byte-identical to its source export');
    const w = R.input && R.input.world, dR = (R.input && R.input.delivery) || {}, dO = (O.input && O.input.delivery) || {};
    if (dR.source !== 'paired' || dR.brainWorld !== pi(w) || dR.storeSourceWorld !== null || dR.brainFile !== `${src}.json`) why.push(`${x}: delivery is not the swapped path from ${src}`);
    if (dO.source !== 'own' || dO.brainWorld !== w || dO.storeSourceWorld !== pi(w) || dO.brainFile !== `${copy}.json` || O.procedure !== 'SWAP_PARITY_OWNPATH') why.push(`${o}: delivery is not the own path of the copy`);
    if (!R.brain || !O.brain || !expected[src] || R.brain.deliveredHash !== O.brain.deliveredHash || R.brain.deliveredHash !== expected[src]) why.push('the delivered store hash differs from the pair or from the expected masked store');
    const d = diffPaths(canon(without(R, SWAP_ALLOWED_DIFFS)), canon(without(O, SWAP_ALLOWED_DIFFS)));
    if (d.length) why.push(`records differ: ${d.slice(0, 5).join(', ')}`);
    if (why.length) fails.push({ pair: [x, o], why });
  }
  return { step: 'SWAP-PARITY', pass: fails.length === 0 && pairs.length > 0, pairs: pairs.length, fails };
}


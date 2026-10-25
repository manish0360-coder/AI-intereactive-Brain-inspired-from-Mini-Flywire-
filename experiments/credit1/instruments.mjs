// ==========================================================
// CREDIT-1 — instruments (pure / observational; DESIGN r2 section 5)
// ==========================================================
//   createTelemetry   the __CREDIT1_TEL__ object: credit begin/end, candidate evaluations (OPT-2 self-target counter),
//                     episode starts (initial / goal / cap), goal-redirect counters.  It only appends to its own arrays.
//   checkCredit       I-CRED, the wiring check: every credit event against the execution probe of the same call
//   createLedger      I-LEDGER: observational wrappers on the keyed store Maps (including transitions' inner maps); every write
//                     is recorded with the main.js line of its caller (stack attribution)
//   evaluateLedger    classifies every recorded write against its site class and the call's operands (EXEC / LEGACY / BOTH / ...)
//   storeHash         canonical hash of the stores (OPT-1: telemetry calls must not change it)
//   blockIntegrity    any instrument FAIL voids the block
// Nothing here reads a clock, draws a random number or imports the runtime.
// ==========================================================
import crypto from 'node:crypto';

const S = (v) => (v === null || v === undefined ? null : String(v));
const sameNode = (a, b) => a !== null && a !== undefined && b !== null && b !== undefined && Number(a) === Number(b);

// ---------------- telemetry ----------------
export function createTelemetry({ callIndex = () => -1 } = {}) {
  const credit = [], ends = [], episodes = [];
  const candidates = {};
  const redirects = { survival: 0, recovery: 0 };
  let open = null;
  const t = {
    credit, ends, episodes, candidates, redirects,
    begin(on, o, x, last, cur, n, goal) {
      const e = { call: callIndex(), on: on === true, o: S(o), x: S(x), last: S(last), cur: S(cur), n: S(n), goal: S(goal), closed: false };
      credit.push(e); open = e;
    },
    end() { const c = callIndex(); ends.push(c); if (open && open.call === c) open.closed = true; open = null; },
    candidate(site, current, k) { const s = (candidates[site] ||= { evaluations: 0, self: 0 }); s.evaluations++; if (sameNode(current, k)) s.self++; },
    episodeStart(kind, node) { episodes.push({ kind: String(kind), call: callIndex(), node: S(node) }); },
    goalRedirect(kind) { if (kind in redirects) redirects[kind]++; else redirects[kind] = 1; },
    openEvent() { return open; },
    summary() {
      return { creditEvents: credit.length, unclosed: credit.filter(e => !e.closed).length, candidates: JSON.parse(JSON.stringify(candidates)),
        episodes: episodes.length, episodeKinds: episodes.reduce((m, e) => ((m[e.kind] = (m[e.kind] || 0) + 1), m), {}), redirects: { ...redirects } };
    },
  };
  return t;
}

// ---------------- I-CRED ----------------
/**
 * creditEvents: telemetry.credit; arrivals: [{ call, a, to, fresh, rFrom }] (execution probe); resets: [{ call, from, to }] (goal-reset probe).
 * aligned arms: o === a, x === to and n === x for EVERY event (no tolerance).  Legacy: the identity rate must be < 1 (positive control).
 */
export function checkCredit({ creditEvents, arrivals, resets = [], arm }) {
  const aligned = arm === 'A' || arm === 'A+';
  const byCall = new Map();
  for (const r of arrivals) { if (!byCall.has(r.call)) byCall.set(r.call, []); byCall.get(r.call).push(r); }
  const resetByCall = new Map(resets.map(r => [r.call, r]));
  const failures = [];
  let identical = 0, informative = 0, fresh = 0, carried = 0, rFromMismatch = 0, crossChecked = 0, crossFailed = 0;
  for (const e of creditEvents) {
    const rs = byCall.get(e.call) || [];
    if (rs.length !== 1) { failures.push({ call: e.call, why: `${rs.length} execution records for one credit event` }); continue; }
    const r = rs[0];
    if (e.last !== null && e.cur !== null && !sameNode(e.last, e.cur)) informative++;
    if (r.fresh === false) carried++; else fresh++;
    if (r.rFrom !== null && r.rFrom !== undefined && !sameNode(r.rFrom, r.a)) rFromMismatch++;
    const id = sameNode(e.o, r.a) && sameNode(e.x, r.to);
    if (id) identical++;
    if (aligned) {
      if (e.on !== true) failures.push({ call: e.call, why: 'aligned arm but the switch was off' });
      if (!id) failures.push({ call: e.call, why: `origin/target ${e.o}->${e.x} differ from the executed ${r.a}->${r.to}` });
      if (!sameNode(e.n, e.x)) failures.push({ call: e.call, why: `next-state operand ${e.n} differs from the executed target ${e.x}` });
    } else {
      if (e.on !== false) failures.push({ call: e.call, why: 'legacy arm but the switch was on' });
      if (!sameNode(e.o, e.last)) failures.push({ call: e.call, why: 'legacy origin is not agentLast' });
    }
    const rs2 = resetByCall.get(e.call);
    if (rs2) { crossChecked++; const ok = aligned ? sameNode(e.o, rs2.from) : true; if (!ok) { crossFailed++; failures.push({ call: e.call, why: `goal-entry origin ${e.o} differs from the goal-reset probe ${rs2.from}` }); } }
  }
  const n = creditEvents.length;
  const identityRate = n ? identical / n : null;
  let verdict;
  if (aligned) verdict = failures.length === 0 ? (n ? 'PASS' : 'NO_EVENTS') : 'FAIL';
  else verdict = failures.length ? 'FAIL' : n === 0 ? 'NO_EVENTS' : identityRate < 1 ? 'DISCRIMINATING' : 'NOT_DISCRIMINATING';
  return { arm, events: n, identical, identityRate, informative, fresh, carried, rFromMismatch, crossChecked, crossFailed, failures, verdict };
}

// ---------------- I-LEDGER ----------------
/**
 * first stack frame inside the tree's main.js -> its line number (pure; the stack text is passed in).
 * Matched on the last two path segments (<unique tree dir>/main.js), URL-decoded and case-folded on both sides, because Windows
 * can report one directory as an 8.3 short path (MANISH~1) or as the long path (Manish%20Raj) in module URLs.
 */
export function parseCaller(stack, treeMainPath) {
  const norm = (p) => { let s = String(p); try { s = decodeURIComponent(s); } catch { /* keep */ } return s.replace(/\\/g, '/').replace(/^file:\/\/\/?/, '').toLowerCase(); };
  const suffix = '/' + norm(treeMainPath).split('/').filter(Boolean).slice(-2).join('/');
  if (suffix.split('/').length < 3) throw new Error('parseCaller: the tree main.js path needs a directory and a file name');
  for (const raw of String(stack).split('\n').slice(1)) {
    const m = raw.match(/\(([^()]+):(\d+):(\d+)\)\s*$/) || raw.match(/^\s*at\s+(.+):(\d+):(\d+)\s*$/);
    if (!m) continue;
    if (norm(m[1]).endsWith(suffix)) return Number(m[2]);
  }
  return null;
}

/**
 * ledger with observational wrappers.  callIndex(): current agent call (-1 before the first); caller(): main.js line of the
 * write (default: parse the stack); pathOf(): the current recentMemory snapshot (for goal-path writes).
 */
export function createLedger({ callIndex = () => -1, caller = () => null, pathOf = () => [] } = {}) {
  const events = [];
  const wrapped = new WeakSet(), owner = new WeakMap(), snap = new WeakMap();
  const record = (map, op, key, existed, extra = {}) => events.push({ seq: events.length, call: callIndex(), map, op, key: S(key), existed, line: caller(), path: pathOf().map(S), ...extra });
  function wrapInner(name, inner, ownerKey) {
    owner.set(inner, ownerKey);
    if (wrapped.has(inner)) return;
    wrapped.add(inner);
    const set0 = inner.set.bind(inner), del0 = inner.delete.bind(inner), clr0 = inner.clear.bind(inner);
    inner.set = (k, v) => { record(name, 'set', `${owner.get(inner)}->${k}`, inner.has(k), { inner: true }); const r = set0(k, v); snap.set(inner, new Map(inner)); return r; };
    inner.delete = (k) => { record(name, 'delete', `${owner.get(inner)}->${k}`, inner.has(k), { inner: true }); const r = del0(k); snap.set(inner, new Map(inner)); return r; };
    inner.clear = () => { record(name, 'clear', `${owner.get(inner)}->*`, inner.size > 0, { inner: true }); const r = clr0(); snap.set(inner, new Map(inner)); return r; };
    snap.set(inner, new Map(inner));
  }
  function wrapMap(name, map, { nested = false } = {}) {
    if (wrapped.has(map)) throw new Error(`ledger: ${name} is already wrapped`);
    wrapped.add(map);
    const set0 = map.set.bind(map), del0 = map.delete.bind(map), clr0 = map.clear.bind(map);
    map.set = (k, v) => {
      const existed = map.has(k);
      if (nested && v instanceof Map) {
        const before = snap.get(v) || new Map();
        // pair writes made on a not-yet-wrapped inner map surface here as changed entries; re-setting an unchanged (already
        // recorded) inner map is not a state change and records nothing
        const changed = [...v.entries()].filter(([ik, iv]) => !before.has(ik) || before.get(ik) !== iv).map(([ik]) => ik);
        for (const ik of changed) record(name, 'set', `${k}->${ik}`, before.has(ik), { outer: true });
        const r = set0(k, v); wrapInner(name, v, k); return r;
      }
      record(name, 'set', k, existed); return set0(k, v);
    };
    map.delete = (k) => { record(name, 'delete', k, map.has(k)); return del0(k); };
    map.clear = () => { record(name, 'clear', '*', map.size > 0); return clr0(); };
    if (nested) for (const [k, v] of map) if (v instanceof Map) wrapInner(name, v, k);
    return map;
  }
  return { events, wrapMap };
}

/**
 * key forms of one credit event.  The EXECUTED pair is (agentCurrent -> x) in every arm - not the operand the arm used (`o`, which
 * is agentLast in L); I-CRED separately checks that aligned arms use it.  The LEGACY pair is (agentLast -> x).
 */
function forms(e) {
  const qk = (p) => `${Number(p)}#${Number(e.goal)}->${e.x}`;
  return { exec: new Set([`${e.cur}->${e.x}`, qk(e.cur)]), legacy: new Set([`${e.last}->${e.x}`, qk(e.last)]) };
}
const pathPairs = (p, goal) => {
  const s = new Set();
  for (let i = 0; i + 1 < p.length; i++) { s.add(`${p[i]}->${p[i + 1]}`); s.add(`${Number(p[i])}#${Number(goal)}->${p[i + 1]}`); }
  return s;
};

/**
 * evaluate recorded writes.  siteClassOf(line) -> a write-census class (BLOCK_REKEY, BLOCK_HELD, BLOCK_PATH, LOAD, DECAY,
 * KEY_PRESERVING, PIPELINE_BRIDGE, PIPELINE_REPLAY, CLICK_ONLY, USER_RESET) or null.  isEdge(a, b) is the graph oracle
 * (analysis only).  creditEvents: telemetry.credit.
 */
export function evaluateLedger({ events, creditEvents, siteClassOf, arm, isEdge }) {
  const aligned = arm === 'A' || arm === 'A+';
  const evByCall = new Map(creditEvents.map(e => [e.call, e]));
  const firstCall = creditEvents.length ? Math.min(...creditEvents.map(e => e.call)) : Infinity;
  const out = { arm, writes: events.length, byClass: {}, keyClass: { EXEC: 0, LEGACY: 0, BOTH: 0, PATH: 0, OTHER: 0 }, informativeExec: 0, legacyNonEdge: 0, held: { EXEC: 0, LEGACY: 0, BOTH: 0 }, failures: [] };
  const fail = (w, why) => out.failures.push({ seq: w.seq, call: w.call, map: w.map, key: w.key, line: w.line, why });
  for (const w of events) {
    const cls = w.line === null ? null : siteClassOf(w.line);
    out.byClass[cls || 'UNATTRIBUTED'] = (out.byClass[cls || 'UNATTRIBUTED'] || 0) + 1;
    if (!cls) { fail(w, 'write from an unattributed or unclassified source line'); continue; }
    if (cls === 'CLICK_ONLY' || cls === 'USER_RESET') { fail(w, `write from a ${cls} site in a harness session`); continue; }
    if (cls === 'LOAD') { if (!(w.call < firstCall) && w.call !== -1) fail(w, 'store restore after the first agent call'); continue; }
    if (cls === 'DECAY' || cls === 'KEY_PRESERVING') { if (w.op === 'set' && w.existed !== true) fail(w, `${cls} write created a new key`); continue; }
    if (cls === 'PIPELINE_BRIDGE' || cls === 'PIPELINE_REPLAY') continue;
    const e = evByCall.get(w.call);
    if (!e) { fail(w, `${cls} write outside any credit event`); continue; }
    if (w.op !== 'set') { fail(w, `${cls} ${w.op} is not expected`); continue; }
    if (cls === 'BLOCK_PATH') {
      if (pathPairs(w.path, e.goal).has(w.key)) out.keyClass.PATH++; else { out.keyClass.OTHER++; fail(w, 'goal-path write is not a consecutive pair of the path'); }
      continue;
    }
    const f = forms(e);
    const isExec = f.exec.has(w.key), isLegacy = f.legacy.has(w.key);
    const kc = isExec && isLegacy ? 'BOTH' : isExec ? 'EXEC' : isLegacy ? 'LEGACY' : 'OTHER';
    out.keyClass[kc]++;
    if (kc === 'OTHER') { fail(w, `${cls} key ${w.key} is neither the executed nor the legacy pair`); continue; }
    if (cls === 'BLOCK_REKEY') {
      if (aligned && kc === 'LEGACY') fail(w, 'aligned arm wrote a legacy key at a re-keyed site');
      if (!aligned && kc === 'EXEC') fail(w, 'legacy arm wrote an executed-pair key at a re-keyed site');
      if (aligned && kc === 'EXEC') out.informativeExec++;
      if (!aligned && kc === 'LEGACY' && !isEdge(e.last, e.x)) out.legacyNonEdge++;
    } else if (cls === 'BLOCK_HELD') {
      out.held[kc]++;
      const wantExec = arm === 'A+';
      if (wantExec && kc === 'LEGACY') fail(w, 'A+ wrote a legacy key at an edge-filtered site');
      if (!wantExec && kc === 'EXEC') fail(w, `${arm} wrote an executed-pair key at an edge-filtered (held) site`);
      const [a, b] = wantExec ? [e.cur, e.x] : [e.last, e.x];
      if (!isEdge(a, b)) fail(w, 'edge-filtered write on a non-edge pair');
    } else fail(w, `unexpected class ${cls}`);
  }
  if (aligned) out.verdict = out.failures.length ? 'FAIL' : 'PASS';
  else out.verdict = out.failures.length ? 'FAIL' : out.legacyNonEdge > 0 ? 'LEGACY_PATTERN' : 'NOT_DISCRIMINATING';
  return out;
}

// ---------------- OPT-1 ----------------
export function storeHash(stores) {
  const canon = (v) => (v instanceof Map ? [...v.entries()].map(([k, x]) => [String(k), canon(x)]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)) : v);
  return crypto.createHash('sha256').update(JSON.stringify(Object.keys(stores).sort().map(k => [k, canon(stores[k])]))).digest('hex');
}

// ---------------- failure handling ----------------
/** any FAIL from I-CRED or I-LEDGER in any session voids the block (it is systematic, never a world exclusion) */
export function blockIntegrity(sessionVerdicts) {
  const failed = sessionVerdicts.filter(v => v.icred === 'FAIL' || v.ledger === 'FAIL');
  return { status: failed.length ? 'VOID' : 'OK', failedSessions: failed.map(v => v.label) };
}

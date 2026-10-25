// ==========================================================
// CREDIT-1 — event classes observed in a real session (pure; CALIBRATION_PROTOCOL D-1c coverage, C-2 rates)
// ==========================================================
//   lineRolesOf(treeMainText)  the 1-based line ranges of the credit block whose writes mark an event class, located by exact
//                              anchors (each start anchor exactly once in the file; each end is the first exact line after it):
//                              PREDERR (the prediction-error branch), FALLBACK (its else branch), DAMPQ (the dampQ call),
//                              CUR_SIGNAL (the curiosity-signal write)
//   classifyEvents(...)        per-class counts from the telemetry credit events, the execution probe, the goal-reset probe and
//                              (when the ledger is on) the attributed writes; a class that needs the ledger is null without it
// The event classes are config.EVENT_CLASSES (the fixture classes of DESIGN r2 section 5).  Nothing here reads a clock, draws a
// random number or imports the runtime.
// ==========================================================
import { EVENT_CLASSES } from './config.mjs';

const sameNode = (a, b) => a !== null && a !== undefined && b !== null && b !== undefined && Number(a) === Number(b);

export const ROLE_ANCHORS = Object.freeze({
  PREDERR: 'if (predError) {',
  ELSE: '} else {',
  ELSE_END: '}',
  DAMPQ: '        dampQ(',
  DAMPQ_END: '        );',
  CUR_SIGNAL: '    if (predError.curiositySignal > 0) {',
  CUR_SIGNAL_END: '    }',
});

export function lineRolesOf(text) {
  const L = String(text).split('\n');
  const problems = [];
  const once = (t) => { const h = []; L.forEach((l, i) => { if (l === t) h.push(i); }); if (h.length !== 1) problems.push(`anchor ${JSON.stringify(t)} found ${h.length} times`); return h.length === 1 ? h[0] : -1; };
  const after = (i, t) => { if (i < 0) return -1; const j = L.findIndex((l, k) => k > i && l === t); if (j < 0) problems.push(`no ${JSON.stringify(t)} after line ${i + 1}`); return j; };
  const p0 = once(ROLE_ANCHORS.PREDERR), p1 = after(p0, ROLE_ANCHORS.ELSE), f1 = after(p1, ROLE_ANCHORS.ELSE_END);
  const d0 = once(ROLE_ANCHORS.DAMPQ), d1 = after(d0, ROLE_ANCHORS.DAMPQ_END);
  const c0 = once(ROLE_ANCHORS.CUR_SIGNAL), c1 = after(c0, ROLE_ANCHORS.CUR_SIGNAL_END);
  if (p1 >= 0 && !/^ {4}\/\/ ── FALLBACK Q-UPDATE/.test(L.slice(p1 + 1).find(l => l.trim() !== '') || '')) problems.push('the else after the prediction-error branch is not the fallback Q-update branch');
  if (!(p0 >= 0 && d0 > p0 && d1 > d0 && d1 < p1)) problems.push('the dampQ call is not inside the prediction-error branch');
  if (!(p0 >= 0 && c0 > p0 && c1 > c0 && c1 < p1)) problems.push('the curiosity-signal write is not inside the prediction-error branch');
  const roles = problems.length ? null : Object.freeze({
    PREDERR: Object.freeze([p0 + 1, p1]),             // up to the line before `} else {`
    FALLBACK: Object.freeze([p1 + 1, f1 + 1]),        // `} else {` .. its closing `}`
    DAMPQ: Object.freeze([d0 + 1, d1 + 1]),
    CUR_SIGNAL: Object.freeze([c0 + 1, c1 + 1]),
  });
  return { roles, problems };
}

/**
 * creditEvents: telemetry.credit [{ call, o, x, last, cur, n, goal }]; arrivals: execution probe [{ call, a, to, fresh }];
 * resets: goal-reset probe [{ call, from, to, goal }]; ledgerEvents: ledger.events [{ call, map, line }] or null (ledger off);
 * roles: lineRolesOf(..).roles; isEdge(a, b): the graph oracle (measurement only).
 */
export function classifyEvents({ creditEvents, arrivals, resets, ledgerEvents, roles, isEdge }) {
  const withLedger = Array.isArray(ledgerEvents);
  const counts = Object.fromEntries(EVENT_CLASSES.map(c => [c, 0]));
  for (const c of ['fallback_branch', 'dampq_firing', 'curiosity_signal_write']) if (!withLedger) counts[c] = null;
  const arrivalAt = new Map();
  for (const r of arrivals) if (!arrivalAt.has(r.call)) arrivalAt.set(r.call, r);
  const resetCalls = [...new Set(resets.map(r => r.call))].sort((a, b) => a - b);
  const resetSet = new Set(resetCalls);
  const inRole = (line, role) => line !== null && line !== undefined && roles && roles[role] && line >= roles[role][0] && line <= roles[role][1];
  const writesAt = new Map();
  if (withLedger) for (const w of ledgerEvents) { if (!writesAt.has(w.call)) writesAt.set(w.call, []); writesAt.get(w.call).push(w); }
  const events = creditEvents.slice().sort((a, b) => a.call - b.call);
  let ptr = 0, pending = false, informative = 0, legacyEdge = 0, alignedEdge = 0;
  for (const e of events) {
    while (ptr < resetCalls.length && resetCalls[ptr] < e.call) { pending = true; ptr++; }
    const isFirst = pending; pending = false;
    const r = arrivalAt.get(e.call) || null;
    const goalEntry = resetSet.has(e.call);
    if (goalEntry) counts.goal_entry_reset++;
    if (isFirst) counts.first_move_after_reset++;
    else if (sameNode(e.last, e.cur)) counts.hold++;
    if (sameNode(e.x, e.cur)) counts.self_target++;
    if (r && r.fresh === false) counts.carried_decision++;
    if (r && !sameNode(r.a, r.to) && !isEdge(r.a, r.to)) counts.nongraph_execution++;
    if (r && !isFirst && !goalEntry && r.fresh !== false && !sameNode(e.last, e.cur) && !sameNode(e.x, e.cur) && isEdge(r.a, r.to)) counts.ordinary_legal_move++;
    if (isEdge(e.cur, e.x)) counts.aplus_filter_pass++; else counts.aplus_filter_fail++;
    if (e.last !== null && e.cur !== null && !sameNode(e.last, e.cur)) { informative++; if (isEdge(e.last, e.x)) legacyEdge++; if (isEdge(e.cur, e.x)) alignedEdge++; }
    if (withLedger) {
      const ws = writesAt.get(e.call) || [];
      if (ws.some(w => inRole(w.line, 'FALLBACK'))) counts.fallback_branch++;
      if (ws.some(w => inRole(w.line, 'DAMPQ'))) counts.dampq_firing++;
      if (ws.some(w => w.map === 'curiosity' && inRole(w.line, 'CUR_SIGNAL'))) counts.curiosity_signal_write++;
    }
  }
  // calls without a credit event: the block guard skipped them
  const creditCalls = new Set(events.map(e => e.call));
  const arrivalCalls = [...arrivalAt.keys()].sort((a, b) => a - b);
  const firstCall = arrivalCalls.length ? arrivalCalls[0] : null;
  const guardSkips = { firstCall: 0, reversal: 0, other: 0 };
  for (const c of arrivalCalls) {
    if (creditCalls.has(c)) continue;
    const r = arrivalAt.get(c), prev = arrivalAt.get(c - 1);
    if (c === firstCall) guardSkips.firstCall++;
    else if (prev && !resetSet.has(c - 1) && sameNode(r.to, prev.a)) guardSkips.reversal++;
    else guardSkips.other++;
  }
  counts.first_call_guard_skip = guardSkips.firstCall;
  counts.reversal_guard_skip = guardSkips.reversal;
  return { counts, creditEvents: events.length, informative, legacyEdge, alignedEdge, guardSkips, withLedger };
}

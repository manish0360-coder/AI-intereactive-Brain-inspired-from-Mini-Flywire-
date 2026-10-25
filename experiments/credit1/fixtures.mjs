// ==========================================================
// CREDIT-1 — deterministic synthetic traces for the instruments (blocker BC-4; DESIGN r2 section 5)
// ==========================================================
// No runtime is loaded.  A small reference model of the credit block (the sites of the write census, with the operands each arm
// uses) writes into REAL Map objects wrapped by the REAL ledger, drives the REAL telemetry object and execution/goal-reset records,
// and the REAL evaluators (checkCredit, evaluateLedger) classify the result.  Each fixture is one call on the real graph
// (connections.json).  Expectations are written by hand per fixture and arm; mutants model transform and instrument bugs that
// the instruments must catch.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTelemetry, checkCredit, createLedger, evaluateLedger, storeHash, blockIntegrity } from './instruments.mjs';
import { EVENT_CLASSES } from './config.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const edges = JSON.parse(fs.readFileSync(path.join(HERE, '..', '..', 'connections.json'), 'utf8'));
const ADJ = new Map();
for (const e of edges) { const a = Number(e.from), b = Number(e.to); if (!ADJ.has(a)) ADJ.set(a, new Set()); if (!ADJ.has(b)) ADJ.set(b, new Set()); ADJ.get(a).add(b); ADJ.get(b).add(a); }
export const isEdge = (a, b) => a != null && b != null && Number(a) !== Number(b) && !!ADJ.get(Number(a)) && ADJ.get(Number(a)).has(Number(b));

// symbolic source lines of the reference model -> write-census class (the real driver uses the tree's line map instead)
export const LINE = Object.freeze({ TD: 1001, DAMPQ: 1002, CUR_SIGNAL: 1003, ATTEMPT: 1004, CUR_KEY: 1005, GOAL_KEY: 1006, PENALTY: 1007, CONF_DEC: 1008,
  GOAL_SCALED: 1009, SHORTCUT: 1010, BADPATH: 1011, SIGNALS: 1012, HELD_TRANSITIONS: 2001, HELD_EXPLORE: 2002, PATH_LOOP: 3001, PATH_PIPELINE: 3002,
  LOAD: 4001, DECAY: 4002, CLICK: 4003, KEY_PRESERVING: 4004, UNKNOWN: 9999 });
const CLASS_OF = new Map([...[1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010, 1011, 1012].map(l => [l, 'BLOCK_REKEY']), [2001, 'BLOCK_HELD'], [2002, 'BLOCK_HELD'],
  [3001, 'BLOCK_PATH'], [3002, 'BLOCK_PATH'], [4001, 'LOAD'], [4002, 'DECAY'], [4003, 'CLICK_ONLY'], [4004, 'KEY_PRESERVING']]);
export const siteClassOf = (line) => CLASS_OF.get(Number(line)) || null;

const fx = (id, cls, s, extra = {}) => Object.freeze({ id, cls, goal: 19, branch: 'predError', compositeError: 0.1, curiositySignal: 0, reward: 1, fresh: true, rFrom: s.cur, recentMemory: [], ...s, ...extra });
// every fixture: one call; s = { last, cur, next }.  Graph facts used are noted per fixture (goal 19: neighbours 6, 17, 20).
export const FIXTURES = Object.freeze([
  fx('F1', 'ordinary_legal_move', { last: 4, cur: 9, next: 10 }, { reward: -1, preamble: true }),       // 9-10 edge, 4-10 not
  fx('F2', 'goal_entry_reset', { last: 8, cur: 17, next: 19 }, { recentMemory: [13, 8, 17, 19], resetTo: 3, safeScoreNegative: true }), // 17-19 edge, 8-19 not
  fx('F3', 'first_move_after_reset', { last: 3, cur: 3, next: 2 }),                                     // 3-2 edge
  fx('F4', 'hold', { last: 5, cur: 5, next: 6 }),                                                       // 5-6 edge
  fx('F5', 'reversal_guard_skip', { last: 6, cur: 10, next: 6 }),
  fx('F6', 'first_call_guard_skip', { last: null, cur: 7, next: 8 }),
  fx('F7', 'self_target', { last: 10, cur: 11, next: 11 }, { fresh: false, rFrom: 10 }),                // 10-11 edge
  fx('F8', 'carried_decision', { last: 13, cur: 14, next: 16 }, { fresh: false, rFrom: 13, safeScoreNegative: true }), // 13-16 edge, 14-16 not
  fx('F9', 'nongraph_execution', { last: 1, cur: 2, next: 9 }),                                         // 2-9 not, 1-9 not
  fx('F10', 'fallback_branch', { last: 5, cur: 8, next: 7 }, { branch: 'fallback' }),                  // 8-7 edge, 5-7 not
  fx('F11', 'dampq_firing', { last: 4, cur: 9, next: 8 }, { compositeError: 0.5 }),                     // 9-8 edge, 4-8 not
  fx('F12', 'curiosity_signal_write', { last: 12, cur: 15, next: 16 }, { curiositySignal: 1 }),        // 15-16 edge, 12-16 not
  fx('F13', 'aplus_filter_pass', { last: 20, cur: 18, next: 16 }),                                      // 18-16 edge, 20-16 not
  fx('F14', 'aplus_filter_fail', { last: 5, cur: 20, next: 7 }),                                        // 20-7 not, 5-7 not
]);
// hand-written expectations: [credit event?, I-CRED verdict, ledger verdict, REKEY key class, held-site writes]
const E = (credit, icred, ledger, rekey, held) => Object.freeze({ credit, icred, ledger, rekey, held });
export const EXPECT = Object.freeze({
  F1: { L: E(true, 'DISCRIMINATING', 'LEGACY_PATTERN', 'LEGACY', 0), A: E(true, 'PASS', 'PASS', 'EXEC', 0), 'A+': E(true, 'PASS', 'PASS', 'EXEC', 4) },
  F2: { L: E(true, 'DISCRIMINATING', 'LEGACY_PATTERN', 'LEGACY', 0), A: E(true, 'PASS', 'PASS', 'EXEC', 0), 'A+': E(true, 'PASS', 'PASS', 'EXEC', 1) },
  F3: { L: E(true, 'NOT_DISCRIMINATING', 'NOT_DISCRIMINATING', 'BOTH', 4), A: E(true, 'PASS', 'PASS', 'BOTH', 4), 'A+': E(true, 'PASS', 'PASS', 'BOTH', 4) },
  F4: { L: E(true, 'NOT_DISCRIMINATING', 'NOT_DISCRIMINATING', 'BOTH', 4), A: E(true, 'PASS', 'PASS', 'BOTH', 4), 'A+': E(true, 'PASS', 'PASS', 'BOTH', 4) },
  F5: { L: E(false, 'NO_EVENTS', 'NOT_DISCRIMINATING', null, 0), A: E(false, 'NO_EVENTS', 'PASS', null, 0), 'A+': E(false, 'NO_EVENTS', 'PASS', null, 0) },
  F6: { L: E(false, 'NO_EVENTS', 'NOT_DISCRIMINATING', null, 0), A: E(false, 'NO_EVENTS', 'PASS', null, 0), 'A+': E(false, 'NO_EVENTS', 'PASS', null, 0) },
  F7: { L: E(true, 'DISCRIMINATING', 'NOT_DISCRIMINATING', 'LEGACY', 4), A: E(true, 'PASS', 'PASS', 'EXEC', 4), 'A+': E(true, 'PASS', 'PASS', 'EXEC', 0) },
  F8: { L: E(true, 'DISCRIMINATING', 'NOT_DISCRIMINATING', 'LEGACY', 4), A: E(true, 'PASS', 'PASS', 'EXEC', 4), 'A+': E(true, 'PASS', 'PASS', 'EXEC', 0) },
  F9: { L: E(true, 'DISCRIMINATING', 'LEGACY_PATTERN', 'LEGACY', 0), A: E(true, 'PASS', 'PASS', 'EXEC', 0), 'A+': E(true, 'PASS', 'PASS', 'EXEC', 0) },
  F10: { L: E(true, 'DISCRIMINATING', 'LEGACY_PATTERN', 'LEGACY', 0), A: E(true, 'PASS', 'PASS', 'EXEC', 0), 'A+': E(true, 'PASS', 'PASS', 'EXEC', 4) },
  F11: { L: E(true, 'DISCRIMINATING', 'LEGACY_PATTERN', 'LEGACY', 0), A: E(true, 'PASS', 'PASS', 'EXEC', 0), 'A+': E(true, 'PASS', 'PASS', 'EXEC', 4) },
  F12: { L: E(true, 'DISCRIMINATING', 'LEGACY_PATTERN', 'LEGACY', 0), A: E(true, 'PASS', 'PASS', 'EXEC', 0), 'A+': E(true, 'PASS', 'PASS', 'EXEC', 4) },
  F13: { L: E(true, 'DISCRIMINATING', 'LEGACY_PATTERN', 'LEGACY', 0), A: E(true, 'PASS', 'PASS', 'EXEC', 0), 'A+': E(true, 'PASS', 'PASS', 'EXEC', 4) },
  F14: { L: E(true, 'DISCRIMINATING', 'LEGACY_PATTERN', 'LEGACY', 0), A: E(true, 'PASS', 'PASS', 'EXEC', 0), 'A+': E(true, 'PASS', 'PASS', 'EXEC', 0) },
});

/** a fresh synthetic session: real Maps wrapped by the real ledger, the real telemetry, probe records */
export function newSession() {
  let call = -1, line = null, recent = [];
  const stores = { Q: new Map(), rewards: new Map(), penalties: new Map(), signals: new Map(), curiosity: new Map(), confidence: new Map(), transitions: new Map(), pathAttempts: new Map(), pathSuccesses: new Map() };
  const ledger = createLedger({ callIndex: () => call, caller: () => line, pathOf: () => recent });
  for (const [n, m] of Object.entries(stores)) ledger.wrapMap(n, m, { nested: n === 'transitions' });
  const tel = createTelemetry({ callIndex: () => call });
  return { stores, ledger, tel, arrivals: [], resets: [], setCall: (c) => { call = c; }, at: (l) => { line = l; }, setPath: (p) => { recent = p.map(String); } };
}
const nested = (s, at, outer, inner) => { s.at(at); const m = s.stores.transitions.get(outer) || new Map(); m.set(inner, (m.get(inner) || 0) + 1); s.stores.transitions.set(outer, m); };

/** the reference credit model for one call; mut: transform/instrument bug to model */
export function simulateCall(f, arm, s, mut = {}) {
  const callNo = 0;
  if (f.preamble) { s.setCall(-1); s.at(LINE.LOAD); s.stores.Q.set('2#19->1', 1); s.stores.rewards.set('2->1', 1); }
  s.setCall(callNo);
  if (f.preamble) { s.at(LINE.DECAY); s.stores.Q.set('2#19->1', 0.999); }
  if (mut.decayCreatesKey) { s.at(LINE.DECAY); s.stores.Q.set('7#19->6', 0.5); }
  if (mut.loadAfterStart) { s.at(LINE.LOAD); s.stores.Q.set('6#19->7', 1); }
  s.arrivals.push({ call: callNo, a: f.cur, to: f.next, fresh: f.fresh, rFrom: f.rFrom });
  const guard = f.last !== null && f.next !== null && f.last !== f.next && f.last !== f.goal;
  if (!guard) return;
  let on = arm !== 'L';
  if (mut.switchOff) on = false;
  if (mut.switchOnInL && arm === 'L') on = true;
  const o = (arm !== 'L' && !mut.switchOff) ? f.cur : f.last;
  const n = mut.nUnchanged ? f.cur : (arm !== 'L' ? f.next : f.cur);
  const pHeld = (arm === 'A+' || mut.heldAligned) ? f.cur : f.last;
  if (mut.telemetrySideEffect) s.stores.Q.set('side#effect->1', 1);
  s.tel.begin(on, o, f.next, f.last, f.cur, n, f.goal);
  const tdOrigin = mut.skipTD ? f.last : o;
  s.at(LINE.TD); s.stores.Q.set(`${Number(tdOrigin)}#${f.goal}->${f.next}`, 1);
  if (f.compositeError > 0.2) { s.at(LINE.DAMPQ); s.stores.Q.set(`${Number(tdOrigin)}#${f.goal}->${f.next}`, 0.9); }
  if (f.curiositySignal > 0) { s.at(LINE.CUR_SIGNAL); s.stores.curiosity.set(`${o}->${f.next}`, 1); }
  s.at(LINE.ATTEMPT); s.stores.pathAttempts.set(`${o}->${f.next}`, 1);
  s.at(LINE.CUR_KEY); s.stores.curiosity.set(`${o}->${f.next}`, 0.15);
  if (isEdge(pHeld, f.next)) nested(s, LINE.HELD_TRANSITIONS, pHeld, f.next);
  let oPost = o;
  if (f.next === f.goal) {
    s.setPath(f.recentMemory);
    s.at(LINE.GOAL_KEY); s.stores.rewards.set(`${o}->${f.goal}`, 1);
    for (let i = 0; i + 1 < f.recentMemory.length; i++) {
      const p = `${f.recentMemory[i]}->${f.recentMemory[i + 1]}`;
      s.at(LINE.PATH_LOOP); s.stores.rewards.set(p, 0.5); s.stores.confidence.set(p, 5); s.stores.pathSuccesses.set(p, 1);
      nested(s, LINE.PATH_PIPELINE, f.recentMemory[i], f.recentMemory[i + 1]);
      s.at(LINE.PATH_PIPELINE); s.stores.Q.set(`${Number(f.recentMemory[i])}#${f.goal}->${f.recentMemory[i + 1]}`, 2);
    }
    if (f.recentMemory.length <= 1) { s.at(LINE.SHORTCUT); s.stores.penalties.set(`${o}->${f.goal}`, 1.5); }
    else { s.at(LINE.GOAL_SCALED); s.stores.rewards.set(`${o}->${f.goal}`, 2); }
    s.resets.push({ call: callNo, from: f.cur, to: f.next, goal: f.goal });
    s.setPath([]);
    if (mut.originAfterReset) oPost = f.resetTo;
  } else if (f.reward < 0) {
    s.at(LINE.PENALTY); s.stores.penalties.set(`${o}->${f.next}`, 0.1);
    s.at(LINE.CONF_DEC); s.stores.confidence.set(`${o}->${f.next}`, 0);
  }
  if (f.safeScoreNegative) { s.at(LINE.BADPATH); s.stores.penalties.set(`${oPost}->${f.next}`, 0.1); }
  s.at(LINE.SIGNALS); s.stores.signals.set(`${oPost}->${f.next}`, 1);
  if (f.next !== f.goal && isEdge(pHeld, f.next)) {
    nested(s, LINE.HELD_EXPLORE, pHeld, f.next);
    s.at(LINE.HELD_EXPLORE); s.stores.Q.set(`${Number(pHeld)}#${f.goal}->${f.next}`, 2.4); s.stores.rewards.set(`${pHeld}->${f.next}`, 1.5);
  }
  if (mut.unknownSite) { s.at(LINE.UNKNOWN); s.stores.Q.set('1#19->2', 1); }
  if (mut.clickWrite) { s.at(LINE.CLICK); s.stores.rewards.set('1->2', 4); }
  s.tel.end();
}

/** run one fixture in one arm; returns the instrument outputs and a summary comparable with EXPECT */
export function runFixture(f, arm, mut = {}) {
  const s = newSession();
  simulateCall(f, arm, s, mut);
  const icred = checkCredit({ creditEvents: s.tel.credit, arrivals: s.arrivals, resets: s.resets, arm });
  const led = evaluateLedger({ events: s.ledger.events, creditEvents: s.tel.credit, siteClassOf, arm, isEdge });
  const rekeyClasses = s.ledger.events.filter(w => siteClassOf(w.line) === 'BLOCK_REKEY').map(w => {
    const e = s.tel.credit.find(x => x.call === w.call); if (!e) return 'NONE';
    const ex = new Set([`${e.cur}->${e.x}`, `${Number(e.cur)}#${Number(e.goal)}->${e.x}`]), lg = new Set([`${e.last}->${e.x}`, `${Number(e.last)}#${Number(e.goal)}->${e.x}`]);
    return ex.has(w.key) && lg.has(w.key) ? 'BOTH' : ex.has(w.key) ? 'EXEC' : lg.has(w.key) ? 'LEGACY' : 'OTHER';
  });
  const uniq = [...new Set(rekeyClasses)];
  return { icred, ledger: led, summary: { credit: s.tel.credit.length > 0, icred: icred.verdict, ledger: led.verdict, rekey: uniq.length === 1 ? uniq[0] : uniq.length === 0 ? null : uniq.join('+'),
    held: s.ledger.events.filter(w => siteClassOf(w.line) === 'BLOCK_HELD').length }, session: s };
}

/** every fixture x arm against its hand-written expectation; every event class covered */
export function checkFixtures() {
  const results = [];
  for (const f of FIXTURES) for (const arm of ['L', 'A', 'A+']) {
    const r = runFixture(f, arm);
    const want = EXPECT[f.id][arm];
    const diffs = Object.keys(want).filter(k => want[k] !== r.summary[k]).map(k => `${k}: expected ${want[k]}, got ${r.summary[k]}`);
    results.push({ fixture: f.id, cls: f.cls, arm, ok: diffs.length === 0, diffs, ledgerFailures: r.ledger.failures.slice(0, 3), icredFailures: r.icred.failures.slice(0, 3) });
  }
  const covered = new Set(FIXTURES.map(f => f.cls));
  const missing = EVENT_CLASSES.filter(c => !covered.has(c));
  return { results, missing };
}

/** instrument mutants: each must be caught (the instrument reports FAIL, or OPT-1 detects the store change) */
export function checkMutants() {
  const F = Object.fromEntries(FIXTURES.map(f => [f.id, f]));
  const caught = [];
  const ledgerFails = (f, arm, mut) => runFixture(F[f], arm, mut).summary.ledger === 'FAIL';
  const icredFails = (f, arm, mut) => runFixture(F[f], arm, mut).summary.icred === 'FAIL';
  caught.push(['MI1 TD state left on agentLast in arm A', ledgerFails('F1', 'A', { skipTD: true })]);
  caught.push(['MI2 A+ operands applied in arm A (held sites aligned)', ledgerFails('F1', 'A', { heldAligned: true })]);
  caught.push(['MI3 next-state operand left as agentCurrent', icredFails('F1', 'A', { nUnchanged: true })]);
  caught.push(['MI4 origin re-read after the goal reset', ledgerFails('F2', 'A', { originAfterReset: true })]);
  caught.push(['MI5 write from an unclassified source line', ledgerFails('F1', 'A', { unknownSite: true })]);
  caught.push(['MI6 write from a click-only site', ledgerFails('F1', 'A', { clickWrite: true })]);
  caught.push(['MI7 store restore after the first call', ledgerFails('F1', 'A', { loadAfterStart: true })]);
  caught.push(['MI8 decay write that creates a key', ledgerFails('F1', 'A', { decayCreatesKey: true })]);
  caught.push(['MI9 aligned arm with the switch off', icredFails('F1', 'A', { switchOff: true })]);
  caught.push(['MI10 legacy arm with the switch on', icredFails('F1', 'L', { switchOnInL: true })]);
  // MI11: no tolerance - 100 credit events, one mismatch, must FAIL
  { const ev = [], ar = [];
    for (let c = 0; c < 100; c++) { ev.push({ call: c, on: true, o: '9', x: '10', last: '4', cur: '9', n: '10', goal: '19' }); ar.push({ call: c, a: 9, to: c === 57 ? 8 : 10, fresh: true, rFrom: 9 }); }
    caught.push(['MI11 one mismatch in 100 events (no tolerance)', checkCredit({ creditEvents: ev, arrivals: ar, resets: [], arm: 'A' }).verdict === 'FAIL']); }
  // MI12 (OPT-1): a telemetry hook with a store side effect is visible in the store hash
  caught.push(['MI12 telemetry hook with a store side effect (OPT-1)', !telemetryNeutral({ sideEffect: true }).neutral]);
  // MI13: failure handling - one FAIL voids the block
  caught.push(['MI13 an instrument FAIL voids the block', blockIntegrity([{ label: 'a', icred: 'PASS', ledger: 'PASS' }, { label: 'b', icred: 'PASS', ledger: 'FAIL' }]).status === 'VOID']);
  return caught.map(([name, ok]) => ({ name, caught: ok === true }));
}

/** OPT-1: telemetry calls leave every store hash unchanged (sideEffect: the mutant that writes Q) */
export function telemetryNeutral({ sideEffect = false } = {}) {
  const stores = { Q: new Map([['1#19->2', 1]]), rewards: new Map([['1->2', 1]]), transitions: new Map([[1, new Map([[2, 3]])]]), pathAttempts: new Map(), pathSuccesses: new Map() };
  const before = storeHash(stores);
  let call = 0;
  const tel = createTelemetry({ callIndex: () => call });
  const T = sideEffect ? { ...tel, begin: (...a) => { stores.Q.set('x#19->y', 1); return tel.begin(...a); } } : tel;
  T.begin(true, 9, 10, 4, 9, 10, 19); T.candidate('all', 9, 9); T.candidate('all', 9, 10); T.episodeStart('goal', 3); T.goalRedirect('recovery'); T.end();
  return { before, after: storeHash(stores), neutral: before === storeHash(stores) };
}

/** OPT-2: the self-target counter */
export function selfTargetCounter() {
  const tel = createTelemetry({ callIndex: () => 0 });
  tel.candidate('all', 5, 5); tel.candidate('all', 5, 6); tel.candidate('all', '5', 5); tel.candidate('structure', 7, '7'); tel.candidate('embedding', 3, 4);
  const c = tel.summary().candidates;
  return { counts: c, ok: c.all.evaluations === 3 && c.all.self === 2 && c.structure.evaluations === 1 && c.structure.self === 1 && c.embedding.evaluations === 1 && c.embedding.self === 0 };
}

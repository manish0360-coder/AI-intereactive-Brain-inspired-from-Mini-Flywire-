// ==========================================================
// H1-R — one agent run per OS process (frozen §5.4), driven through the UNCHANGED
// experiments/m7/run.js of the given tree.
//   argv[2] = JSON { tree, configSeed, configIndex, agentSeed, arm, h1r: 'on'|'off',
//                    trustMode, record: bool, ticks }
// Prints '@@H1R@@' + JSON. With record=false only the fingerprint is reported.
// ==========================================================
import fs from 'node:fs';
import { register } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { installH1R } from './runtime.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const IN = JSON.parse(process.argv[2]);
const TREE_URL = pathToFileURL(IN.tree).href;
const env = await import(TREE_URL + '/experiments/m7/env.js');
const trust = await import(TREE_URL + '/render/trustMemory.js');
const { Q } = await import(TREE_URL + '/render/qlearning.js');
const H = IN.h1r === 'on' ? await installH1R({ tree: IN.tree, trustMode: IN.trustMode || 'traversal' }) : null;

const N = (x) => (x === null || x === undefined) ? null : Number(x);
const ADJ = new Set();
for (const e of JSON.parse(fs.readFileSync(path.join(IN.tree, 'connections.json'), 'utf8'))) {
  ADJ.add(N(e.from) + '|' + N(e.to)); ADJ.add(N(e.to) + '|' + N(e.from));
}
const isEdge = (a, b) => a != null && b != null && N(a) !== N(b) && ADJ.has(N(a) + '|' + N(b));
const inc = (o, k, d = 1) => { o[k] = (o[k] || 0) + d; };
const frozenTrust = () => !!(globalThis.__H1R__ && globalThis.__H1R__.on && globalThis.__H1R__.trustFrozen());

const S = {
  tick: -1, prevRef: undefined, replayThis: false, noCommitDecisionTicks: 0, replayTicks: 0, awaitFresh: false, preResetRef: undefined, goalId: null, transitionsRef: null,
  moves: {}, goals: { n: 0, canonical: 0, stale: 0, stalePostReset: 0 }, stalePostResetMoves: 0,
  q: { goalN: 0, goalNot12: 0, edgeKeys: 0, nonEdgeKeys: 0, nonEdgeAligned: 0 },
  tr: { n: 0, nonEdge: 0 }, pipe: {}, epTr: { n: 0, nonEdge: 0 }, epCredit: { offered: 0, applied: 0, nonEdgeApplied: 0 },
  e2a: new Map(), e2s: new Map(),
  trustChecks: { snapshots: 0, maxSgtA: 0, maxTrust: -Infinity, minTrust: Infinity, nonEdgeKeysMax: 0, reconMismatchMax: 0 },
  q0: null, t0: null, sel: { n: 0, chosenArgmax: 0, chosenExplore: 0, byState: {} },
  e3: { n: 0, pass: 0, half: 0, other: 0 }, e4: { n: 0, nul: 0, pass: 0 },
  realized: new Set(),
  // R1: every learning write of a tick is resolved against that tick's realised transition
  T: null, lastMove: null, envDrawsSeen: 0,
  r1: { ticks: { move: 0, slip: 0, goal: 0, self: 0, none: 0, nonedge: 0 },
    learn: { n: 0, onUnrealised: 0, mismatch: 0, missing: 0, duplicate: 0 },
    q: { n: 0, onUnrealised: 0, onSlip: 0, onSlipPositive: 0, mismatch: 0, missing: 0, duplicate: 0, nonEdge: 0,
         rewardByKind: { move: {}, goal: {}, slip: {}, other: {} } },
    ret: { n: 0, covered: 0 }, tr: { n: 0, unrealised: 0 }, explore: { n: 0, unrealised: 0 }, success: { n: 0, unrealised: 0 },
    env: { ticks: 0, mismatch: 0, maxPerTick: 0, draws: 0, expected: 0, goalEntryDraws: 0 } },
};
const newTick = () => ({ learn: [], q: [], tr: [], min: [], goal: null, move: null });
// Resolve one finished tick. The realised transition comes from the hooks (both orders): a goal reach
// (goal hook; the goal move never draws), else the E1 site (move hook: from, intended, traversed).
function finishTick(T, drawsThisTick) {
  const r = S.r1;
  let kind = 'none', from = null, to = null;
  if (T.goal) { kind = 'goal'; from = N(T.goal.from); to = N(T.goal.to); }
  else if (T.move && T.move.to !== null && T.move.to !== undefined && !T.move.gReset) {
    from = N(T.move.from); to = N(T.move.to);
    kind = from === to ? 'self' : !isEdge(from, to) ? 'nonedge' : T.move.traversed ? 'move' : 'slip';
  }
  r.ticks[kind]++;
  const realised = kind === 'move' || kind === 'goal';
  const isReturn = kind === 'move' && S.lastMove && S.lastMove.to === from && S.lastMove.from === to;
  // learning-section entries
  r.learn.n += T.learn.length;
  if (!realised) r.learn.onUnrealised += T.learn.length;
  else { if (T.learn.length === 0) r.learn.missing++; if (T.learn.length > 1) r.learn.duplicate++;
    for (const e of T.learn) if (N(e.last) !== from || N(e.next) !== to) r.learn.mismatch++; }
  // main TD Q updates (FROZEN included: the call is made, then blocked at the choke point)
  r.q.n += T.q.length;
  for (const u of T.q) {
    const k = realised ? kind : kind === 'slip' ? 'slip' : 'other';
    r.q.rewardByKind[k][u.reward] = (r.q.rewardByKind[k][u.reward] || 0) + 1;
    if (!isEdge(u.s, u.a)) r.q.nonEdge++;
    if (!realised) { r.q.onUnrealised++; if (kind === 'slip') { r.q.onSlip++; if (u.reward > 0) r.q.onSlipPositive++; } }
    else if (N(u.s) !== from || N(u.a) !== to || N(u.sp) !== to) r.q.mismatch++;
  }
  if (realised) { if (T.q.length === 0) r.q.missing++; if (T.q.length > 1) r.q.duplicate++; }
  if (isReturn) { r.ret.n++; if (T.q.length === 1 && T.learn.length === 1) r.ret.covered++; }
  // other learning stores
  for (const p of T.tr) { r.tr.n++; if (!realised || N(p.prev) !== from || N(p.current) !== to) r.tr.unrealised++; }
  for (const p of T.min) { r.explore.n++; if (kind !== 'move' || N(p.from) !== from || N(p.to) !== to) r.explore.unrealised++; }
  // environment draws: exactly one for an edge attempt that is not a goal entry; none otherwise
  const expected = (kind === 'move' || kind === 'slip') ? 1 : 0;
  r.env.ticks++; r.env.draws += drawsThisTick; r.env.expected += expected;
  if (drawsThisTick !== expected) r.env.mismatch++;
  if (kind === 'goal' && drawsThisTick > 0) r.env.goalEntryDraws++;
  r.env.maxPerTick = Math.max(r.env.maxPerTick, drawsThisTick);
  if (kind === 'move') S.lastMove = { from, to };
}
function closeTick() {
  if (!S.T) return;
  const d = env.getCounters().envDraws; finishTick(S.T, d - S.envDrawsSeen); S.envDrawsSeen = d;
}
const fresh = () => globalThis.lastReasoning !== S.prevRef;
const qSnap = () => new Map(Q);
const tSnap = () => ({ a: new Map(trust.pathAttempts), s: new Map(trust.pathSuccesses) });

function trustCheck() {
  const c = S.trustChecks; c.snapshots++;
  let sgta = 0, ne = 0, mism = 0;
  const keys = new Set([...trust.pathAttempts.keys(), ...trust.pathSuccesses.keys()]);
  for (const k of keys) {
    const a = trust.pathAttempts.get(k) || 0, s = trust.pathSuccesses.get(k) || 0;
    if (s > a + 1e-9) sgta++;
    const t = (s + 1) / (a + 2); if (t > c.maxTrust) c.maxTrust = t; if (t < c.minTrust) c.minTrust = t;
    const [f, to] = k.split('->'); if (!isEdge(f, to)) ne++;
    if (Math.abs(a - (S.e2a.get(k) || 0)) > 1e-6 || Math.abs(s - (S.e2s.get(k) || 0)) > 1e-6) mism++;
  }
  c.maxSgtA = Math.max(c.maxSgtA, sgta); c.nonEdgeKeysMax = Math.max(c.nonEdgeKeysMax, ne);
  c.reconMismatchMax = Math.max(c.reconMismatchMax, mism);
}

if (IN.record) {
  globalThis.__M7_TEL__ = {
    step() {
      if (S.tick >= 0) { if (S.replayThis) S.replayTicks++; else if (globalThis.lastReasoning === S.prevRef) S.noCommitDecisionTicks++; }
      closeTick(); S.T = newTick(); if (globalThis.__H1R__) globalThis.__H1R__.r1 = null;
      S.tick++; S.prevRef = globalThis.lastReasoning; S.replayThis = false;
      if (S.tick === 0) { S.q0 = qSnap(); S.t0 = tSnap(); }
      if (S.tick % 100 === 0) trustCheck();
    },
    replayBranch() { S.replayThis = true; },
  };
  let armsObj;
  Object.defineProperty(globalThis, '__M7_ARMS__', {
    configurable: true,
    get() { return armsObj; },
    set(v) {
      armsObj = {
        bayesianTrustFor(f, t, raw) { const d = v.bayesianTrustFor(f, t, raw); S.e3.n++;
          if (d === raw) S.e3.pass++; else if (d === 0.5) S.e3.half++; else S.e3.other++; return d; },
        aggregateTrustFor(raw) { const d = v.aggregateTrustFor(raw); S.e4.n++;
          if (d === null && raw !== null) S.e4.nul++; else S.e4.pass++; return d; },
      };
    },
  });
  globalThis.__R__ = {
    goal(aCur, nxt) {
      S.goals.n++; if (isEdge(aCur, nxt)) S.goals.canonical++; if (!fresh()) S.goals.stale++;
      if (S.awaitFresh && globalThis.lastReasoning === S.preResetRef) S.goals.stalePostReset++;
      S.realized.add(aCur + '->' + nxt);
      if (S.T) S.T.goal = { from: aCur, to: nxt };
    },
    learn(aLast, nxt, aCur) { if (S.T) S.T.learn.push({ last: aLast, next: nxt, cur: aCur }); },
    explore() { /* offered pair; the learned pair is recorded by pipe('min') */ },
    move(from, to, traversed, gReset) {
      if (S.T) S.T.move = { from, to, traversed, gReset };
      if (to === null || to === undefined || gReset) return;
      if (S.awaitFresh) { if (globalThis.lastReasoning === S.preResetRef) S.stalePostResetMoves++; else S.awaitFresh = false; }
      const self = N(from) === N(to), edge = isEdge(from, to);
      inc(S.moves, self ? 'selfNoop' : edge ? (traversed ? 'edgeSuccess' : 'edgeSlip') : 'NONEDGE');
      if (edge && traversed) S.realized.add(from + '->' + to);
      if (edge && !frozenTrust()) {
        const k = from + '->' + to;
        S.e2a.set(k, (S.e2a.get(k) || 0) + 1); if (traversed) S.e2s.set(k, (S.e2s.get(k) || 0) + 1);
      }
    },
    q(aLast, nxt, reward, aCur) {
      if (N(nxt) === N(S.goalId)) { S.q.goalN++; if (reward !== 12) S.q.goalNot12++; }
      if (isEdge(aLast, nxt)) S.q.edgeKeys++; else { S.q.nonEdgeKeys++; if (N(aLast) === N(aCur)) S.q.nonEdgeAligned++; }
      if (S.T) S.T.q.push({ s: aLast, a: nxt, sp: aCur, reward });
    },
    tr(prev, current, transitions) { S.transitionsRef = transitions; S.tr.n++; if (!isEdge(prev, current)) S.tr.nonEdge++; if (S.T) S.T.tr.push({ prev, current }); },
    reset() { S.preResetRef = globalThis.lastReasoning; S.awaitFresh = true; S.realized = new Set(); S.lastMove = null; },
    decay(rate) {
      if (frozenTrust()) return;
      for (const m of [S.e2a, S.e2s]) for (const [k, v] of [...m]) { const d = v * rate; if (d < 0.01) m.delete(k); else m.set(k, d); }
    },
    sel(step, cur, nextKey, top, explore, nb) {
      if (step !== 0) return;
      S.sel.n++;
      if (N(nextKey) === N(top)) S.sel.chosenArgmax++;
      if (explore !== null && N(nextKey) === N(explore)) S.sel.chosenExplore++;
      const b = S.sel.byState[cur] || (S.sel.byState[cur] = { nb: nb.length, counts: new Array(nb.length).fill(0), other: 0 });
      const j = nb.map(N).indexOf(N(nextKey)); if (j >= 0) b.counts[j]++; else b.other++;
    },
    pipe(kind, source, trs) {
      const b = S.pipe[kind + ':' + source] || (S.pipe[kind + ':' + source] = { episodes: 0, pairs: 0, nonEdgePairs: 0 });
      b.episodes++; for (const p of (trs || [])) { b.pairs++; if (!isEdge(p.from, p.to)) b.nonEdgePairs++; }
      if (kind === 'min' && S.T) for (const p of (trs || [])) S.T.min.push({ from: p.from, to: p.to });   // judged against this tick's realised move
      if (kind === 'full' && source === 'autonomous_success') for (const p of (trs || [])) { S.r1.success.n++; if (!S.realized.has(p.from + '->' + p.to)) S.r1.success.unrealised++; }
    },
    epTr(from, to) { S.epTr.n++; if (!isEdge(from, to)) S.epTr.nonEdge++; },
    epCredit(key) {
      S.epCredit.offered++;
      const applied = !(globalThis.__H1R__ && globalThis.__H1R__.on && globalThis.__M7_CREDIT__ && !globalThis.__H1R__.episodeCreditAllowed(key));
      if (applied) {
        S.epCredit.applied++;
        S.e2s.set(String(key), (S.e2s.get(String(key)) || 0) + 1);
        const [f, t] = String(key).split('->'); if (!isEdge(f, t)) S.epCredit.nonEdgeApplied++;
      }
    },
  };
  process.env.H1R_VERIFY_TREE_URL = TREE_URL;
  register(pathToFileURL(path.join(HERE, 'verify_hook.mjs')).href, import.meta.url);
}

const { runOnce } = await import(TREE_URL + '/experiments/m7/run.js');
S.goalId = env.generateAccepted(IN.configSeed, IN.configIndex).cfg.goal;
const rec = await runOnce({ configSeed: IN.configSeed, configIndex: IN.configIndex, agentSeed: IN.agentSeed,
  arm: IN.arm, envMode: 'on', creditMode: 'on', pin: 'on', tickUnit: 'step', ticks: IN.ticks || 3000,
  crashAtTick: null, warmStore: false });
const out = { configSeed: IN.configSeed, configIndex: IN.configIndex, arm: IN.arm, h1r: IN.h1r, trustMode: IN.trustMode || null,
  record: !!IN.record, fp: rec.fingerprint, cog: rec.artifacts.cogDraws, completed: rec.outcome.completed, crashed: rec.outcome.crashed };

if (IN.record) {
  closeTick();
  trustCheck();
  const qEnd = qSnap(), tEnd = tSnap();
  const delta = (m0, m1) => {
    let changed = 0, maxAbs = 0; const ks = new Set([...m0.keys(), ...m1.keys()]);
    for (const k of ks) { const d = Math.abs((m1.get(k) || 0) - (m0.get(k) || 0)); if (d > 0) changed++; if (d > maxAbs) maxAbs = d; }
    return { keys0: m0.size, keys1: m1.size, changed, maxAbs };
  };
  let transEntries = 0, transNonEdge = 0;
  if (S.transitionsRef) for (const [f, m] of S.transitionsRef) for (const [t] of m) { transEntries++; if (!isEdge(f, t)) transNonEdge++; }
  let qNonEdgeEntries = 0;
  for (const k of qEnd.keys()) { const [st, act] = k.split('->'); if (!isEdge(st.split('#')[0], act)) qNonEdgeEntries++; }
  Object.assign(out, {
    moves: S.moves, goals: S.goals, stalePostResetMoves: S.stalePostResetMoves, q: S.q, qNonEdgeEntriesEnd: qNonEdgeEntries,
    tr: S.tr, transitionsEnd: { entries: transEntries, nonEdge: transNonEdge }, pipe: S.pipe, epTr: S.epTr,
    epCredit: S.epCredit, trustChecks: S.trustChecks, ticksSeen: S.tick + 1, replayTicks: S.replayTicks, noCommitDecisionTicks: S.noCommitDecisionTicks,
    qDelta: S.q0 ? delta(S.q0, qEnd) : null,
    trustDeltaA: S.t0 ? delta(S.t0.a, tEnd.a) : null, trustDeltaS: S.t0 ? delta(S.t0.s, tEnd.s) : null,
    sel: S.sel, e3: S.e3, e4: S.e4,
    h1rCounters: H ? { blockedIllegal: H.counters.blockedIllegal, resets: H.counters.resets,
      uniformDecisions: H.counters.uniformDecisions, armsSeen: [...H.counters.armsSeen] } : null,
    r1: S.r1, r1stats: H ? H.r1stats : null, envCounters: env.getCounters(),
  });
}
process.stdout.write('@@H1R@@' + JSON.stringify(out));

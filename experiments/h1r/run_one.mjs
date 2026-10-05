// ==========================================================
// H1-R — one agent run per OS process (frozen §5.4), driven through the UNCHANGED
// experiments/m7/run.js of the given tree.
//   argv[2] = JSON { tree, configSeed, configIndex, agentSeed, arm, h1r: 'on'|'off',
//                    trustMode, record: bool, ticks, envBlock: 'pilot'|'heldout', envIndex }
//   envBlock/envIndex (H1R on only): the run's design position for the R3 environment stream.
//   measure: true attaches the measurement layer (measure_install.mjs, N5′ checked at installation).
// Prints '@@H1R@@' + JSON. With record=false only the fingerprint is reported.
// MS-1: with record and measure, every measurement record is reconciled against this recorder's own independent
// observation (per-tick flags, per-attempt records with prior trust, resets, floor raises, both trust snapshots,
// E3 deliveries for N6b), and the shadow integrity checks run (shadow.mjs). Counts only leave the process.
// ==========================================================
import fs from 'node:fs';
import { register } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { installH1R } from './runtime.mjs';
import { installMeasure, verifySinkBinding } from './measure_install.mjs';
import { analyzeShadow } from './shadow.mjs';
import { blockCodeOf } from './env_seed.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const IN = JSON.parse(process.argv[2]);
const TREE_URL = pathToFileURL(IN.tree).href;
const env = await import(TREE_URL + '/experiments/m7/env.js');
const trust = await import(TREE_URL + '/render/trustMemory.js');
const { Q } = await import(TREE_URL + '/render/qlearning.js');
const envPosition = (IN.h1r === 'on' && IN.envBlock !== undefined)
  ? { agentSeed: IN.agentSeed ?? 20260819000, blockCode: blockCodeOf(IN.envBlock), acceptedConfigIndex: IN.envIndex } : null;
const H = IN.h1r === 'on' ? await installH1R({ tree: IN.tree, trustMode: IN.trustMode || 'traversal', envPosition }) : null;
const MEAS = IN.measure ? installMeasure() : null;   // D-5 measurement layer (observational); N5′ checked here
const PINNED_SCORE = MEAS ? MEAS.score : null;
if (MEAS && H) await H.attachMeasure(MEAS);          // MS-1: per-attempt, reset and snapshot forwarding
// Independent mirror of the environment stream: the R3 derived seed when the run carries a design position,
// else B2's instrumentation/rng.js initRng derivation (environment = makeRng(seed ^ 0x5EED)).
// A separate generator instance owned by this recorder: it never touches the agent's named streams. Used to
// check every drawn attempt exactly: outcome == (u_k < p_e), with u_k the k-th environment draw of the run.
const { makeRng } = await import(TREE_URL + '/instrumentation/rng.js');
const ENV_MIRROR_SEED = H && H.envStream ? H.envStream.envSeed : ((IN.agentSeed ?? 20260819000) ^ 0x5EED) >>> 0;
const ENV_MIRROR = makeRng(ENV_MIRROR_SEED);
const h1rOn = () => !!(globalThis.__H1R__ && globalThis.__H1R__.on);

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
  moves: {}, goals: { n: 0, canonical: 0, stale: 0, stalePostReset: 0, staleReattempt: 0, staleOther: 0 }, stalePostResetMoves: 0,
  prevSlip: null, tickSummary: new Map(),
  q: { goalN: 0, goalNot12: 0, edgeKeys: 0, nonEdgeKeys: 0, nonEdgeAligned: 0 },
  tr: { n: 0, nonEdge: 0 }, pipe: {}, epTr: { n: 0, nonEdge: 0 }, epCredit: { offered: 0, applied: 0, nonEdgeApplied: 0 },
  e2a: new Map(), e2s: new Map(),
  trustChecks: { snapshots: 0, maxSgtA: 0, maxTrust: -Infinity, minTrust: Infinity, nonEdgeKeysMax: 0, reconMismatchMax: 0 },
  q0: null, t0: null, sel: { n: 0, chosenArgmax: 0, chosenExplore: 0, byState: {} },
  e3: { n: 0, pass: 0, half: 0, other: 0 }, e4: { n: 0, nul: 0, pass: 0 },
  realized: new Set(),
  // R1: every learning write of a tick is resolved against that tick's realised transition
  T: null, lastMove: null, envDrawsSeen: 0,
  // MS-1 reconciliation: the recorder's own per-tick, per-attempt, reset, floor, loop-entry and E3 observations
  ms1: { sel: [], rep: [], e3: [], attempts: [], resets: [], floors: [], loopEntries: 0, snapLoop: null, snapStep: null },
  r1: { ticks: { move: 0, slip: 0, goal: 0, self: 0, none: 0, nonedge: 0 },
    learn: { n: 0, onUnrealised: 0, mismatch: 0, missing: 0, duplicate: 0 },
    q: { n: 0, onUnrealised: 0, onSlip: 0, onSlipPositive: 0, mismatch: 0, missing: 0, duplicate: 0, nonEdge: 0,
         rewardByKind: { move: {}, goal: {}, slip: {}, other: {} } },
    ret: { n: 0, covered: 0 }, tr: { n: 0, unrealised: 0 }, explore: { n: 0, unrealised: 0 }, success: { n: 0, unrealised: 0 },
    env: { ticks: 0, mismatch: 0, maxPerTick: 0, draws: 0, expected: 0, goalEntryDraws: 0 },
    // R2 / D-1: every edge-attempt decision, split into goal-entering and other, with the hidden p_e of
    // the attempted edge at that tick (env.trueP, a harness-only accessor that draws nothing)
    goalAttempts: { n: 0, slips: 0, successes: 0 },
    // exact per-attempt draw check against the mirrored environment stream
    drawCheck: { goal: { checked: 0, mismatch: 0 }, other: { checked: 0, mismatch: 0 }, unattributed: 0 },
    calib: { goal: { n: 0, succ: 0, sumP: 0, sumPQ: 0 }, other: { n: 0, succ: 0, sumP: 0, sumPQ: 0 },
             // diagnostic splits of the non-goal class: an immediate retry of the edge that slipped on the previous
             // tick vs any other attempt; Phase I vs Phase II (call index < 1505: 5 pre-boot calls + 1500 ticks)
             otherRetry: { n: 0, succ: 0, sumP: 0, sumPQ: 0 }, otherFresh: { n: 0, succ: 0, sumP: 0, sumPQ: 0 },
             otherP1: { n: 0, succ: 0, sumP: 0, sumPQ: 0 }, otherP2: { n: 0, succ: 0, sumP: 0, sumPQ: 0 } } },
};
const newTick = () => ({ learn: [], q: [], tr: [], min: [], goal: null, move: null, p: null, index: null, prior: null });
// raw store values of a directed key, read at the hook (no write)
const priorOf = (a, b) => { const k = a + '->' + b; return [trust.pathAttempts.get(k) || 0, trust.pathSuccesses.get(k) || 0]; };
// the trust store as [[key, a, s]], every key of either map
const storeList = () => [...new Set([...trust.pathAttempts.keys(), ...trust.pathSuccesses.keys()].map(String))]
  .map(k => [k, trust.pathAttempts.get(k) || 0, trust.pathSuccesses.get(k) || 0]);
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
  // environment draws: exactly one per edge attempt. A goal entry draws under H1R (R2 / D-1) and never in
  // the B2 order; anything else (self no-op, no decision) draws nothing.
  const goalDraws = h1rOn() ? 1 : 0;
  const expected = (kind === 'move' || kind === 'slip') ? 1 : kind === 'goal' ? goalDraws : 0;
  r.env.ticks++; r.env.draws += drawsThisTick; r.env.expected += expected;
  if (drawsThisTick !== expected) r.env.mismatch++;
  if (kind === 'goal' && drawsThisTick > 0) r.env.goalEntryDraws++;
  r.env.maxPerTick = Math.max(r.env.maxPerTick, drawsThisTick);
  if (kind === 'move') S.lastMove = { from, to };
  // exact draw check: each environment draw of this tick is the next value of the mirrored stream
  for (let d = 0; d < drawsThisTick; d++) {
    const u = ENV_MIRROR();
    if (d === 0 && (kind === 'move' || kind === 'slip' || kind === 'goal') && typeof T.p === 'number') {
      const c = r.drawCheck[to === N(S.goalId) ? 'goal' : 'other'];
      c.checked++; if ((u < T.p) !== (kind !== 'slip')) c.mismatch++;
    } else r.drawCheck.unattributed++;
  }
  // reliability calibration of the realised outcomes, pooled over the run (environment property only)
  if ((kind === 'move' || kind === 'slip' || kind === 'goal') && typeof T.p === 'number') {
    const toGoal = to === N(S.goalId), c = toGoal ? r.calib.goal : r.calib.other, ok = kind !== 'slip';
    const add = (b) => { b.n++; if (ok) b.succ++; b.sumP += T.p; b.sumPQ += T.p * (1 - T.p); };
    add(c);
    if (!toGoal) {
      const retry = S.prevSlip && N(S.prevSlip.from) === from && N(S.prevSlip.to) === to;
      add(retry ? r.calib.otherRetry : r.calib.otherFresh);
      add(T.index < 1505 ? r.calib.otherP1 : r.calib.otherP2);
    }
    if (toGoal) { r.goalAttempts.n++; if (ok) r.goalAttempts.successes++; else r.goalAttempts.slips++; }
  }
  S.prevSlip = kind === 'slip' ? { from, to } : null;
  // MS-1: the recorder's per-attempt record (one per drawn edge attempt), prior raw trust read at the hook
  if (drawsThisTick === 1 && (kind === 'move' || kind === 'slip' || kind === 'goal'))
    S.ms1.attempts.push([T.index, from, to, kind !== 'slip' ? 1 : 0, to === N(S.goalId) ? 1 : 0, T.prior ? T.prior[0] : null, T.prior ? T.prior[1] : null]);
  if (MEAS) S.tickSummary.set(T.index, { learn: T.learn.length, reward: T.q.length ? T.q[0].reward : undefined, realised });
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
      S.tick++; S.T.index = S.tick; S.prevRef = globalThis.lastReasoning; S.replayThis = false;
      if (S.tick === 0) { S.q0 = qSnap(); S.t0 = tSnap(); }
      if (S.tick === 1505) S.ms1.snapStep = storeList();   // MS-1 anti-vacuity: the store at M-STEP of call 1505 (after loop pre-work)
      if (S.tick % 100 === 0) trustCheck();
    },
    replayBranch() { S.replayThis = true; S.ms1.rep[S.tick] = (S.ms1.rep[S.tick] || 0) + 1; },
  };
  let armsObj;
  Object.defineProperty(globalThis, '__M7_ARMS__', {
    configurable: true,
    get() { return armsObj; },
    set(v) {
      armsObj = {
        bayesianTrustFor(f, t, raw) { const d = v.bayesianTrustFor(f, t, raw); S.e3.n++; S.ms1.e3.push(d);
          if (d === raw) S.e3.pass++; else if (d === 0.5) S.e3.half++; else S.e3.other++; return d; },
        aggregateTrustFor(raw) { const d = v.aggregateTrustFor(raw); S.e4.n++;
          if (d === null && raw !== null) S.e4.nul++; else S.e4.pass++; return d; },
      };
    },
  });
  globalThis.__R__ = {
    goal(aCur, nxt) {
      S.goals.n++; if (isEdge(aCur, nxt)) S.goals.canonical++;
      if (!fresh()) {
        S.goals.stale++;
        // a replay-branch tick re-executing the goal attempt that slipped on the previous tick (F2b,
        // frozen §9.2 territory) versus any other stale goal reach
        const re = S.replayThis && S.prevSlip && N(S.prevSlip.from) === N(aCur) && N(S.prevSlip.to) === N(nxt);
        if (re) S.goals.staleReattempt++; else S.goals.staleOther++;
      }
      if (S.awaitFresh && globalThis.lastReasoning === S.preResetRef) S.goals.stalePostReset++;
      S.realized.add(aCur + '->' + nxt);
      if (S.T) { S.T.goal = { from: aCur, to: nxt }; S.T.p = env.trueP(aCur, nxt); S.T.prior = priorOf(aCur, nxt); }
      // R2 / D-1: under H1R a realised goal entry is credited like any traversal (a += 1, s += 1)
      if (h1rOn() && !frozenTrust() && isEdge(aCur, nxt)) {
        const k = aCur + '->' + nxt;
        S.e2a.set(k, (S.e2a.get(k) || 0) + 1); S.e2s.set(k, (S.e2s.get(k) || 0) + 1);
      }
    },
    learn(aLast, nxt, aCur) { if (S.T) S.T.learn.push({ last: aLast, next: nxt, cur: aCur }); },
    explore() { /* offered pair; the learned pair is recorded by pipe('min') */ },
    move(from, to, traversed, gReset) {
      if (S.T) S.T.move = { from, to, traversed, gReset };
      if (to === null || to === undefined || gReset) return;
      if (S.T && isEdge(from, to)) { S.T.p = env.trueP(from, to); S.T.prior = priorOf(from, to); }
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
    reset(kind) { S.preResetRef = globalThis.lastReasoning; S.awaitFresh = true; S.realized = new Set(); S.lastMove = null; S.ms1.resets.push([S.tick, kind]); },
    // MS-1: the A5 aggregate floor, recomputed from the inputs of updateBehavior's branch (TRUST_SCALE 10, B2)
    floorCheck(aggregateTrust, confidenceState) { if (aggregateTrust !== null && aggregateTrust > 0 && confidenceState < aggregateTrust * 10) S.ms1.floors.push(S.tick); },
    // MS-1: runAgentLoop entry; at the entry with 1,505 completed calls, the store, the phase and the entry index
    loop() { S.ms1.loopEntries++; if (S.tick + 1 === 1505) S.ms1.snapLoop = { entry: S.ms1.loopEntries - 1, phase: env.getPhase(), store: storeList() }; },
    decay(rate) {
      if (frozenTrust()) return;
      for (const m of [S.e2a, S.e2s]) for (const [k, v] of [...m]) { const d = v * rate; if (d < 0.01) m.delete(k); else m.set(k, d); }
    },
    sel(step, cur, nextKey, top, explore, nb) {
      if (step !== 0) return;
      S.ms1.sel[S.tick] = (S.ms1.sel[S.tick] || 0) + 1;
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
if (MEAS && H) H.finalSnapshot();                     // MS-1: as run_h1r.mjs, immediately after runOnce
const out = { configSeed: IN.configSeed, configIndex: IN.configIndex, arm: IN.arm, h1r: IN.h1r, trustMode: IN.trustMode || null,
  record: !!IN.record, fp: rec.fingerprint, cog: rec.artifacts.cogDraws, completed: rec.outcome.completed, crashed: rec.outcome.crashed,
  // R3: the stream actually registered (runtime log), the mirror's seed, and the per-run draw consumption
  envStream: H ? H.envStream : null, envSeedLog: H ? H.envSeedLog : null, envMirrorSeed: ENV_MIRROR_SEED,
  envDraws: rec.artifacts.envCounters.envDraws, vis: rec.artifacts.visDraws, acceptedSeed: rec.provenance.acceptedSeed };

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
// D-5: reconcile the measurement record with the recorder's own per-tick observation (the learning-section
// entry and the reward the main TD update used). Counts and a digest only: no reward value leaves this process.
if (MEAS) {
  const m = MEAS.record();
  const meas = { calls: m.calls, eventCount: m.eventCount, multi: m.multi, orphan: m.orphan, nonFinite: m.nonFinite, digest: MEAS.digest() };
  if (IN.record) {
    let presence = 0, value = 0, onUnrealised = 0, compared = 0;
    const seen = new Set();
    for (const [i, v] of m.events) {
      seen.add(i); const t = S.tickSummary.get(i);
      if (!t || t.learn !== 1) { presence++; continue; }
      if (!t.realised) onUnrealised++;
      compared++; if (t.reward !== v) value++;
    }
    for (const [i, t] of S.tickSummary) if (t.learn > 0 && !seen.has(i)) presence++;
    Object.assign(meas, { compared, presenceMismatch: presence, valueMismatch: value, eventsOnUnrealised: onUnrealised, ticksSeen: S.tick + 1 });
    meas.ms1 = reconcileMs1(m);
  }
  meas.sinkBindingAtEnd = verifySinkBinding(globalThis, PINNED_SCORE).ok;
  const { arbitrate } = await import(TREE_URL + '/render/executiveController.js');
  const sh = analyzeShadow(m, arbitrate);
  meas.shadow = { pairingOk: sh.pairingOk, groups: sh.groups, groupFaults: sh.groupFaults, argmaxMismatch: sh.argmaxMismatch, step0Groups: sh.step0Groups,
    step0Candidates: sh.step0Candidates, step0ArgmaxMismatch: sh.step0ArgmaxMismatch, step0GroupsPerCallMax: sh.step0GroupsPerCallMax,
    reconstructionMismatch: sh.reconstructionMismatch, flips: sh.flips, nonFiniteStep0: sh.nonFiniteStep0 };
  meas.score = { calls: sh.scoreCalls, candidateRecords: sh.candidateRecords, nonFiniteF: sh.nonFiniteF, nonFiniteT: sh.nonFiniteT,
    clampBinding: sh.clampBinding, clampBindingHigh: sh.clampBindingHigh, clampBindingLow: sh.clampBindingLow, n6bClampMismatch: sh.n6bClampMismatch };
  meas.counts = { decisions: m.decisions.length, replays: m.replays.length, attempts: m.attempts.length, resets: m.resets.length, floors: m.floors.length,
    snapshots: m.snapshots.map(x => [x[0], x[1], x[2].length]), forks: m.forks.length };
  out.measurement = meas;
}
process.stdout.write('@@H1R@@' + JSON.stringify(out));

// MS-1: every measurement record against the recorder's independent observation (counts only)
function reconcileMs1(m) {
  const r = {};
  // per-tick flags: decision = a step-0 selection write (the recorder's sel hook), replay = the E6 replay flag
  { const n = m.calls, dec = new Array(n).fill(0), rep = new Array(n).fill(0);
    for (const [c] of m.decisions) dec[c]++; for (const c of m.replays) rep[c]++;
    let dm = 0, rm = 0, both = 0, D = 0, Rr = 0, Nn = 0;
    for (let i = 0; i < n; i++) { if (dec[i] !== (S.ms1.sel[i] || 0)) dm++; if (rep[i] !== (S.ms1.rep[i] || 0)) rm++;
      if (dec[i] && rep[i]) both++; else if (dec[i]) D++; else if (rep[i]) Rr++; else Nn++; }
    r.ticks = { calls: n, decisionMismatch: dm, replayMismatch: rm, both, decision: D, replay: Rr, noCommit: Nn, maxDecisionsPerCall: Math.max(0, ...dec) }; }
  // per-attempt: call, edge, outcome, goal-entering flag and prior raw trust, record by record
  { const a = m.attempts, b = S.ms1.attempts; let mism = 0, prior = 0, goal = 0;
    for (let k = 0; k < Math.max(a.length, b.length); k++) { const x = a[k], y = b[k];
      if (!x || !y || x[0] !== y[0] || x[1] !== N(y[1]) || x[2] !== N(y[2]) || x[3] !== y[3]) { mism++; continue; }
      if (x[4] !== y[4]) goal++; if (!Object.is(x[5], y[5]) || !Object.is(x[6], y[6])) prior++; }
    r.attempts = { measured: a.length, recorded: b.length, envDraws: env.getCounters().envDraws, mismatch: mism, goalFlagMismatch: goal, priorMismatch: prior,
      goalEntering: a.filter(x => x[4] === 1).length }; }
  // resets: measurement (runtime forwarding) = recorder's reset hook = runtime counters
  { const a = m.resets, b = S.ms1.resets; let mism = 0;
    for (let k = 0; k < Math.max(a.length, b.length); k++) if (!a[k] || !b[k] || a[k][0] !== b[k][0] || a[k][1] !== b[k][1]) mism++;
    r.resets = { measured: a.length, recorded: b.length, mismatch: mism, runtimeGoal: H ? H.counters.resets.goal : null, runtimeCap: H ? H.counters.resets.cap : null,
      goal: a.filter(x => x[1] === 'goal').length, cap: a.filter(x => x[1] === 'cap').length }; }
  // floor raises: M-FLOOR records = the recorder's recomputation of the branch condition, call by call
  { const a = m.floors, b = S.ms1.floors; let mism = 0;
    for (let k = 0; k < Math.max(a.length, b.length); k++) if (a[k] !== b[k]) mism++;
    r.floors = { measured: a.length, recorded: b.length, mismatch: mism }; }
  // trust snapshots: placement (entry index, phase, 1,505 calls) and content (store a, s; raw per-phase attempts)
  { const byKey = (rows) => new Map(rows.map(e => [String(e[0]), e]));
    const diff = (snapRows, store) => { const x = byKey(snapRows), y = byKey(store); let d = 0;
      for (const k of new Set([...x.keys(), ...y.keys()])) { const p = x.get(k), q = y.get(k);
        if (!Object.is(p ? p[1] : 0, q ? q[1] : 0) || !Object.is(p ? p[2] : 0, q ? q[2] : 0)) d++; } return d; };
    const rawOf = (lo, hi) => { const mm = new Map(); for (const a of S.ms1.attempts) { const tau = a[0] - 5; if (tau >= lo && tau <= hi) { const k = a[1] + '->' + a[2]; mm.set(k, (mm.get(k) || 0) + 1); } } return mm; };
    const rawDiff = (snapRows, mm) => { const x = byKey(snapRows); let d = 0;
      for (const k of new Set([...x.keys(), ...mm.keys()])) { const p = x.get(k); if ((p ? p[3] : 0) !== (mm.get(k) || 0)) d++; } return d; };
    const s1 = m.snapshots.find(x => x[0] === 'tau1499'), s2 = m.snapshots.find(x => x[0] === 'tau2999'), L = S.ms1.snapLoop;
    r.snapshots = { count: m.snapshots.length, tau1499Calls: s1 ? s1[1] : null, tau2999Calls: s2 ? s2[1] : null,
      loopEntry: L ? L.entry : null, phase: L ? L.phase : null, runtimeLoopIndex: H ? H.instrument.snapshotLoop : null, loopEntries: S.ms1.loopEntries,
      tau1499StoreMismatch: s1 && L ? diff(s1[2], L.store) : null, tau2999StoreMismatch: s2 ? diff(s2[2], storeList()) : null,
      tau1499RawMismatch: s1 ? rawDiff(s1[2], rawOf(0, 1499)) : null, tau2999RawMismatch: s2 ? rawDiff(s2[2], rawOf(1500, 2999)) : null,
      stepStoreDiffersFromLoop: L && S.ms1.snapStep ? diff(L.store.map(e => [...e, 0]), S.ms1.snapStep) : null }; }
  // N6b: k-th score pair against the k-th E3 delivery: t = 12·(T − 0.5) exactly (clamp consistency: shadow.mjs)
  { let term = 0; const n = Math.min(m.score.length / 2, S.ms1.e3.length);
    for (let k = 0; k < n; k++) if (!Object.is(m.score[2 * k + 1], 12 * (S.ms1.e3[k] - 0.5))) term++;
    r.n6b = { pairs: m.score.length / 2, e3Deliveries: S.ms1.e3.length, termMismatch: term }; }
  return r;
}

// Study-2 S-SHADOW capture — the per-event logic of the readiness child (experiments/study2/child.mjs,
// gated at cfadedd9 by verify_readiness.js G1–G3), factored out so the Study-2 run child uses the SAME
// event definition, the SAME K(e) checks and the SAME temporal witnesses.
//
// Differences from the readiness child, all additive:
//   * FULL reads the snapshot through a frozen read-only view (get only), so the shadow path cannot mutate it;
//   * the step-0 vectors (k, FS_FULL, FS_GEO) are retained per event so post-run analysis can score them.
// Event records are field-for-field those of the readiness child; verify_driver.js D8–D13 proves identity on
// the permitted development replay by comparing against the committed readiness evidence.
//
// No oracle, no p, no tau-b, no Delta: those exist only in analyze_study2.mjs, a separate process.
import crypto from 'node:crypto';

export const encScore = (x) => (Number.isFinite(x) ? x : String(x));      // JSON cannot hold -Infinity
export const decScore = (x) => {
  if (typeof x === 'number') return x;
  if (x === '-Infinity') return -Infinity;
  throw new Error(`S2 capture: undecodable score ${JSON.stringify(x)}`);
};

export function installCapture({ FULL, GEO, search, TR, DIRECTED, distFrom }) {
  const liveSnapshot = () => {
    const m = new Map();
    for (const [u, v] of DIRECTED) { const r = TR.recordFor(u, v); if (r.a > 0) m.set(`${u}->${v}`, Object.freeze({ a: r.a, s: r.s })); }
    return m;
  };
  const hashMap = (m) => crypto.createHash('sha256').update(JSON.stringify([...m.entries()])).digest('hex');

  const events = [];
  const vectors = [];
  const eventsPerStep = new Map();
  const tickLog = [];                                              // [setTick argument, last completed runAgent index]
  let lastTick = null;
  globalThis.__S2_TICK__ = (t) => { tickLog.push([t, globalThis.__S2_STEP__ ?? -1]); lastTick = t; };
  // K(e) = the candidate set scored at STEP 0 of the agent-loop runPrediction(agentCurrent) (Director ruling).
  // Imagined successor states (chain steps 1..STEPS-1) are counted and EXCLUDED; they never enter an event.
  let open = false, calls0 = null, keys0 = null, sorted0 = null, final0 = null;
  let imaginedCalls = 0, imaginedKeys = 0, snap = null, snapView = null, snapHash = null, step = null, stepTick = null;
  let inInvocationDepth = 0, decisionBefore = null;               // temporal-alignment witnesses
  globalThis.__S2_BEGIN__ = () => {
    if (open) throw new Error('S2: nested decision event');
    open = true; calls0 = []; keys0 = []; sorted0 = null; final0 = null; imaginedCalls = 0; imaginedKeys = 0;
    step = globalThis.__S2_STEP__; stepTick = lastTick;
    inInvocationDepth = 1; decisionBefore = globalThis.lastReasoning;   // the PREVIOUS decision object
    snap = liveSnapshot(); snapHash = hashMap(snap);              // captured ONCE, before any scoring
    const bound = snap;
    snapView = Object.freeze({ get: (key) => bound.get(key) });  // read-only: the shadow path cannot write
  };
  globalThis.__S2_KEY__ = (chain, k) => { if (!open) return; if (chain === 0) keys0.push(Number(k)); else imaginedKeys++; };
  // TEMPORAL ALIGNMENT: the shadow FULL/GEO scores are computed HERE — synchronously inside the step-0
  // runPrediction invocation, immediately after the production futureScore returned, before runPrediction
  // continues. The snapshot is bound only for the FULL call; GEO reads no evidence at all.
  globalThis.__S2_CALL__ = (id, g, v, chain) => {
    if (!open) return;
    if (chain !== 0) { imaginedCalls++; return; }
    const k = Number(id);
    const n = search.findNeuronById(k);
    globalThis.__S2_SNAPSHOT__ = snapView;
    const full = FULL.futureScore(n, g);
    globalThis.__S2_SNAPSHOT__ = null;
    const geo = GEO.futureScore(n, g);
    // [5] evaluated between BEGIN and END; [6] the step-0 decision had NOT yet been taken
    calls0.push([k, g, v, full, geo, inInvocationDepth === 1, globalThis.lastReasoning === decisionBefore]);
  };
  globalThis.__S2_RANK__ = (chain, kind, keys) => {
    if (!open || chain !== 0) return;
    if (kind === 'sorted') sorted0 = keys.map(Number); else if (kind === 'final') final0 = keys.map(Number);
  };
  globalThis.__S2_END__ = () => {
    open = false; inInvocationDepth = 0;
    const decisionTakenAfter = globalThis.lastReasoning !== decisionBefore;
    const executed = globalThis.lastReasoning ? Number(globalThis.lastReasoning.to) : null;   // set on step 0 only
    const liveUnchanged = hashMap(liveSnapshot()) === snapHash;   // nothing wrote evidence during scoring
    // ---- candidate-set identity (checks A-G) ----
    const fsIds = calls0.map((c) => c[0]);
    const rank = sorted0 || [];
    const fsSet = new Set(fsIds), rankSet = new Set(rank);
    const missing = rank.filter((k) => !fsSet.has(k));             // ranked but not FutureScore-scored
    const extra = fsIds.filter((k) => !rankSet.has(k));            // scored but not ranked
    const idCheck = {
      A_sameIds: missing.length === 0 && extra.length === 0,
      B_sameCardinality: fsIds.length === rank.length,
      C_noMissing: missing.length === 0,
      D_noExtra: extra.length === 0,
      E_noDuplicates: fsSet.size === fsIds.length && rankSet.size === rank.length,
      F_orderDeterministic: keys0.length === fsIds.length && keys0.every((k, i) => k === fsIds[i]),
      G_targetEqualsCandidate: keys0.length === fsIds.length && keys0.every((k, i) => k === fsIds[i]),
    };
    // ---- G-IMPL-1 identities on step-0 candidates only (shadows were computed in-invocation) ----
    const raw = [];
    let fullEqLive = true, geoEqNegD = true;
    const goals = new Set(calls0.map((c) => c[1]));
    const shadowInInvocation = calls0.every((c) => c[5] === true);
    const shadowBeforeDecision = calls0.every((c) => c[6] === true) && decisionTakenAfter;
    for (const [k, g, v, full, geo] of calls0) {
      const d = distFrom(Number(g)).get(k);
      if (full !== v) fullEqLive = false;
      if (geo !== (d === undefined ? -Infinity : -d)) geoEqNegD = false;
      raw.push([k, v, full, geo]);
    }
    const snapUnchanged = hashMap(snap) === snapHash;              // the snapshot itself was not mutated
    const augmented = (final0 || []).filter((k) => !fsSet.has(k)); // final-ranking entries FutureScore never scored
    events.push({ t: step, lastTick: stepTick, nCand: calls0.length, goalCount: goals.size,
      fullEqLive, geoEqNegD, liveUnchanged, snapUnchanged, shadowInInvocation, shadowBeforeDecision, snapUnboundAfter: globalThis.__S2_SNAPSHOT__ === null,
      idCheck, missing, extra,
      imaginedCalls, imaginedKeys, nAugmented: augmented.length,
      executedInK: executed !== null && fsSet.has(executed), executedAugmented: executed !== null && augmented.includes(executed),
      rawHash: crypto.createHash('sha256').update(JSON.stringify(raw)).digest('hex') });
    // retained for post-run analysis only: tau = runAgent index - 5 (G-IMPL-3), goal, and the step-0 vectors
    vectors.push({ tau: step - 5, goal: calls0.length ? Number(calls0[0][1]) : null,
      k: raw.map((r) => r[0]), full: raw.map((r) => encScore(r[2])), geo: raw.map((r) => encScore(r[3])) });
    eventsPerStep.set(step, (eventsPerStep.get(step) || 0) + 1);
  };
  const uninstall = () => { for (const k of ['__S2_BEGIN__', '__S2_CALL__', '__S2_END__', '__S2_TICK__', '__S2_KEY__', '__S2_RANK__']) globalThis[k] = null; };
  return { events, vectors, tickLog, eventsPerStep, uninstall };
}

// Recompute an event's readiness rawHash from its persisted vectors. FULL == live on every valid event, so the
// live value is the FULL value. Used by the run child's self-check and by the driver gate.
export function rawHashOfVector(vec) {
  const raw = vec.k.map((k, i) => { const f = decScore(vec.full[i]); return [k, f, f, decScore(vec.geo[i])]; });
  return crypto.createHash('sha256').update(JSON.stringify(raw)).digest('hex');
}

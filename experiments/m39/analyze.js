// ==========================================================
// M39-P1 ANALYSIS — pure functions over child outputs
// ==========================================================
// Oracle, estimand diagnostics and every P0-P7 / X1-X6 predicate, exactly as
// research/preregistrations/M39_FUTURESCORE_SHADOW_EVALUATION_FORMULATION.md §5-§9, §12, §15.
// Development pilot only: descriptive diagnostics, no inference, no interpretation.
// ==========================================================

export const CAP = 20;
export const ORACLE_REL_TOL = 1e-12;

// §6 — set-valued expected-attempts oracle over graph neighbours:
//   R*(u) = argmin_{v in N(u)} [ 1/p(u,v) + C(v) ],  C = env.expectedCostToGoal(p, goal)
// Every member of an exact (to relative 1e-12) tie is optimal; no ordering is privileged.
export function oracleSet(u, goal, p, env) {
  const C = env.expectedCostToGoal(p, goal);
  const nodes = [...new Set([...env.decisionStates(goal), goal])];
  const cand = [];
  for (const v of nodes) {
    const e = env.edgeIndexOf(u, v);
    if (e === undefined || v === u) continue;
    cand.push([v, 1 / p[e] + C.get(v)]);
  }
  const min = Math.min(...cand.map(([, c]) => c));
  const tol = ORACLE_REL_TOL * Math.max(1, Math.abs(min));
  return cand.filter(([, c]) => c - min <= tol).map(([v]) => v).sort((a, b) => a - b);
}

const eqPool = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const keysOf = (pool) => (pool || []).map(([k]) => String(k)).sort();
const inSet = (key, set) => key !== null && key !== undefined && set.map(String).includes(String(key));

// §8 E2 diagnostics — computed from the ON and ZERO arms ONLY (ORACLE-INJECTED and PERM never enter)
export function e2Diagnostics(fixtures) {
  let attainable = 0, unattainable = 0, undefinedStates = 0, nPlus = 0, nMinus = 0, changed = 0, defined = 0;
  for (const fx of fixtures) {
    for (const u of fx.states) {
      const s = fx.primary[u], on = s.on, zero = s.zero;
      if (!on.pool || on.pool.length === 0 || on.best === null || zero.best === null) { undefinedStates++; continue; }
      defined++;
      if (String(on.best) !== String(zero.best)) changed++;
      const att = s.oracleSet.some(v => keysOf(on.pool).includes(String(v)));
      if (!att) { unattainable++; continue; }
      attainable++;
      const a = inSet(on.best, s.oracleSet), b = inSet(zero.best, s.oracleSet);
      if (a && !b) nPlus++;
      if (!a && b) nMinus++;
    }
  }
  return { defined, undefinedStates, attainable, unattainable, nPlus, nMinus, changed,
           D: defined ? changed / defined : 0 };
}

// ---- gates -------------------------------------------------------------------------------------------
// `pairs` = [[processA, processB], ...] one pair per fixture; mutants may pass single-process pairs [a, a].
export function gates(pairs) {
  const A = pairs.map(([a]) => a);
  const res = {};
  const per = (fn) => A.every(fx => fx.states.every(u => fn(fx.primary[u], u, fx)));

  // P0 — instrumentation connected to the intended sites; ON == unguarded production path exactly
  res.P0 = per(s => s.on.step0 && s.on.pool && s.on.ledger && s.prod.pool &&
    String(s.on.best) === String(s.prod.best) && eqPool(s.on.pool, s.prod.pool) &&
    s.on.ledger.choicesLength === s.on.pool.length && s.zero.step0 && s.oracle.step0);

  // P1 — reproducible repaired-source snapshot at the absolute end of an ARMED M7 run, after T_SHIFT
  res.P1 = pairs.every(([a, b]) => a.run.completed && b.run.completed && a.run.replayOnce && b.run.replayOnce &&
    a.run.ticksExecuted === a.run.ticksRequested && a.run.ticksRequested === 3000 && a.tShift < a.run.ticksExecuted &&
    a.run.phaseAtSnapshot === 2 && a.run.fingerprint === b.run.fingerprint &&
    a.snapshotBefore.digest === b.snapshotBefore.digest);

  // P2 — decision-time pool identical across every arm, both processes; P0 (pre-filter) keys too
  res.P2 = pairs.every(([a, b]) => a.states.every(u => {
    const s = a.primary[u], t = b.primary[u];
    const k = keysOf(s.on.pool);
    const arms = [s.zero, s.oracle, s.prod, ...s.perm.filter(Boolean), ...(s.zeroPerm ? [s.zeroPerm] : [])];
    return arms.every(r => eqPool(keysOf(r.pool), k)) && eqPool(s.on.pool, t.on.pool) &&
      arms.every(r => !r.step0 || eqPool(r.step0.keys, s.on.step0.keys));
  }));

  // P3 — FutureScore values reproducible; ON delivers them; ZERO is genuinely zero; PERM preserves the
  //      P-multiset while changing assignment; ORACLE-INJECTED delivers the cap on R* only
  let permRankable = 0, permChanged = 0;
  res.P3 = pairs.every(([a, b]) => a.states.every(u => {
    const s = a.primary[u], t = b.primary[u];
    const vals = s.on.step0.values, keys = s.on.step0.keys.map(String);
    const poolIdx = keys.map((k, i) => [k, i]).filter(([k]) => keysOf(s.on.pool).includes(k)).map(([, i]) => i);
    const sameVals = [s.zero, s.oracle, ...s.perm.filter(Boolean)].every(r => eqPool(r.step0.values, vals)) &&
      eqPool(t.on.step0.values, vals);
    const onOk = eqPool(s.on.step0.delivered, vals);
    const zeroOk = s.zero.step0.delivered.every(v => v === 0);
    const oracleOk = s.oracle.step0.delivered.every((v, i) => v === (inSet(keys[i], s.oracleSet) ? CAP : 0));
    const distinct = new Set(poolIdx.map(i => vals[i])).size;
    let permOk = true;
    for (const r of s.perm.filter(Boolean)) {
      const d = r.step0.delivered;
      const mP = poolIdx.map(i => d[i]).sort((x, y) => x - y), vP = poolIdx.map(i => vals[i]).sort((x, y) => x - y);
      const outsideSame = keys.every((k, i) => poolIdx.includes(i) || d[i] === vals[i]);
      if (!eqPool(mP, vP) || !outsideSame) permOk = false;
      if (distinct >= 2) { permRankable++; if (poolIdx.some(i => d[i] !== vals[i])) permChanged++; else permOk = false; }
    }
    return sameVals && onOk && zeroOk && oracleOk && permOk;
  }));
  res.permAssignmentChangedWhereRankable = { permChanged, permRankable };

  // P4 — readouts identical under a 1e8 ms clock shift, every arm
  res.P4 = A.every(fx => fx.states.every(u => {
    const s = fx.primary[u], t = fx.shifted[u];
    const pair = (x, y) => String(x.best) === String(y.best) && eqPool(x.pool, y.pool);
    return pair(s.on, t.on) && pair(s.zero, t.zero) && pair(s.oracle, t.oracle) && pair(s.prod, t.prod) &&
      s.perm.every((r, j) => (r === null) === (t.perm[j] === null) && (!r || pair(r, t.perm[j])));
  }));

  // E2 diagnostics (ON vs ZERO only), attainability, degeneracy
  const e2 = e2Diagnostics(A);
  res.e2 = e2;
  res.P5 = e2.attainable + e2.unattainable === e2.defined;           // descriptive: fully accounted, no cutoff
  res.P6 = e2.nPlus + e2.nMinus > 0 && e2.D > 0;                     // formulation §12
  let poolCands = 0, atCap = 0, rankable = 0, singleValued = 0, attainableStates = 0, controllable = 0;
  for (const fx of A) for (const u of fx.states) {
    const s = fx.primary[u];
    if (!s.on.pool || !s.on.pool.length) continue;
    const keys = s.on.step0.keys.map(String), vals = s.on.step0.values;
    const pv = keys.map((k, i) => [k, vals[i]]).filter(([k]) => keysOf(s.on.pool).includes(k)).map(([, v]) => v);
    poolCands += pv.length; atCap += pv.filter(v => v === CAP).length;
    if (new Set(pv).size >= 2) rankable++; else singleValued++;
    if (s.oracleSet.some(v => keysOf(s.on.pool).includes(String(v)))) {
      attainableStates++;
      if (inSet(s.oracle.best, s.oracleSet)) controllable++;
    }
  }
  res.degeneracy = { poolCands, atCap, capFraction: poolCands ? atCap / poolCands : 0, rankable, singleValued,
                     attainableStates, controllable };
  res.P7 = rankable > 0 && controllable > 0 && res.P3;

  // X1-X6 — formulation §15
  const allValuesZero = A.every(fx => fx.states.every(u => fx.primary[u].on.step0.values.every(v => v === 0)));
  const x6 = A.some(fx => fx.states.some(u => {
    const s = fx.primary[u];
    return s.zeroPerm && (String(s.zeroPerm.best) !== String(s.zero.best) || !eqPool(s.zeroPerm.pool, s.zero.pool));
  }));
  res.X = {
    X1: !(res.P0 && res.P1 && res.P2 && res.P3 && res.P4),
    X2: allValuesZero,
    X3: e2.attainable === 0,
    X4: e2.nPlus + e2.nMinus === 0,
    X5: rankable === 0 || controllable === 0,
    X6: x6,
  };
  return res;
}

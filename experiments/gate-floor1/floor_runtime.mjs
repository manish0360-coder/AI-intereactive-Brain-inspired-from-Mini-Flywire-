// ==========================================================
// GATE-FLOOR-1 — goal-entry floor runtime (globalThis.__GATEFLOOR1__)
// ==========================================================
// Consulted ONLY by the single guarded line that transform.mjs inserts after the goal-entering candidate's
//     goalGradientBoost = 100 * tc;
// in main.js.  Pure: draws no random number, owns no learning state, reads nothing but its arguments and the graph
// edge oracle it was constructed with.  `entry()` returns the value goalGradientBoost takes for the goal-entering
// candidate:
//     100 * tc                      when the floor is not applicable (unchanged: the original expression)
//     100 * max(tc, tcFloor)        when the candidate is a LEGAL graph edge into the active goal
// so it can only RAISE a score, only on the goal-entering candidate, only through the term the original expression
// computes.  `tc` is the runtime's own trajectory confidence (adjacency count / 5, capped at 1).
//
// The guard in the inserted line also requires `on`; with the global absent (the default) the line is inert.
// ==========================================================

/**
 * @param {{on:boolean, tcFloor:number, isEdge:(a:any,b:any)=>boolean}} cfg
 *   isEdge: the graph edge oracle of the world (the same one the N1 mask and guard use); required.
 */
export function createFloor({ on = true, tcFloor, isEdge }) {
  if (typeof isEdge !== 'function') throw new Error('GATE-FLOOR-1: an edge oracle is required');
  if (!(typeof tcFloor === 'number' && tcFloor >= 0 && tcFloor <= 1)) throw new Error('GATE-FLOOR-1: tcFloor must be a number in [0, 1]');
  const counters = { evaluated: 0, legal: 0, notLegal: 0, raised: 0, lowered: 0, maxRaise: 0 };
  const byEdge = new Map();                  // "from->goal" -> { evaluated, raised }
  const F = {
    on: !!on,
    tcFloor,
    counters,
    /** the value of goalGradientBoost for the goal-entering candidate (from -> goal) */
    entry(from, to, goal, tc, inStructure) {
      const base = 100 * tc;
      counters.evaluated++;
      const legal = inStructure === true && Number(to) === Number(goal) && Number(from) !== Number(to) && isEdge(from, to) === true;
      if (!legal) { counters.notLegal++; return base; }
      counters.legal++;
      const key = `${from}->${to}`;
      const rec = byEdge.get(key) || { evaluated: 0, raised: 0 };
      rec.evaluated++;
      const t = Math.max(tc, tcFloor);
      if (t > tc) { counters.raised++; rec.raised++; counters.maxRaise = Math.max(counters.maxRaise, 100 * (t - tc)); }
      byEdge.set(key, rec);
      const ret = 100 * t;
      if (ret < base) counters.lowered++;      // cannot happen (t >= tc); counted so the audit can state it
      return ret;
    },
    snapshot() { return { tcFloor, on: F.on, counters: { ...counters }, byEdge: Object.fromEntries([...byEdge.entries()].sort()) }; },
  };
  return F;
}

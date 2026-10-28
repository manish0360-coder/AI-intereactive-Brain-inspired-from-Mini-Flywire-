// ==========================================================
// COG-A — the environment (one session = one world x one condition; one instance per session)
// ==========================================================
// attempt(from, to, step):
//   from === to          'self' no-op: returns true, consumes no draw, logged with kind 2
//   not a graph edge     REFUSED: returns false (the agent stays, the step is consumed), consumes no draw, logged with kind 0
//   graph edge e         succeeds iff u(e, j) < p_phase(e), where u(e, j) is the j-th draw of the world's slip stream of edge e in
//                        this session (common random numbers: the same u(e, j) for every agent and condition), logged with kind 1
// phase: 2 iff condition === 'SWAP' and step >= T_SHIFT, else 1.  nextStart(): the world's start stream, one draw per episode in
// episode order, uniform over non-goal nodes (used by the baselines; MFW draws its own starts).
// Log rows: [step, from, to, kind, success].
// ==========================================================
import { T_SHIFT } from './config.mjs';
import { GRAPH, edgeIndex } from './worlds.mjs';
import { stream, envSlip, envStart } from './rngid.mjs';

export const KIND = Object.freeze({ REFUSED: 0, EDGE: 1, SELF: 2 });

export class CogaEnv {
  constructor(world, condition) {
    if (!['SWAP', 'NOSWAP'].includes(condition)) throw new Error(`unknown condition ${condition}`);
    this.world = world; this.condition = condition;
    this.slip = GRAPH.edges.map(e => stream(envSlip(world.id, e.i)));
    this.attemptsOnEdge = new Array(GRAPH.edges.length).fill(0);
    this.startRng = stream(envStart(world.id));
    this.nonGoal = GRAPH.nodes.filter(n => n !== world.goal);
    this.log = []; this.refused = 0; this.self = 0;
  }
  phaseAt(step) { return this.condition === 'SWAP' && step >= T_SHIFT ? 2 : 1; }
  attempt(from, to, step) {
    from = Number(from); to = Number(to);
    if (from === to) { this.self++; this.log.push([step, from, to, KIND.SELF, 1]); return true; }
    const e = edgeIndex(from, to);
    if (e === undefined) { this.refused++; this.log.push([step, from, to, KIND.REFUSED, 0]); return false; }
    this.attemptsOnEdge[e]++;
    const u = this.slip[e]();
    const p = (this.phaseAt(step) === 2 ? this.world.p2 : this.world.p1)[e];
    const ok = u < p;
    this.log.push([step, from, to, KIND.EDGE, ok ? 1 : 0]);
    return ok;
  }
  nextStart() { return this.nonGoal[Math.floor(this.startRng() * this.nonGoal.length)]; }
}

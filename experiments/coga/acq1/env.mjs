// ==========================================================
// ACQ-1 — the static environment of one session (one world x one environment E1 / E2)
// ==========================================================
// attempt(from, to, step): the same contract as ../envsim.mjs (self no-op, refused non-edge, Bernoulli edge with common random
// numbers per edge and attempt index), with a constant p vector for the whole session: there is no phase and no change.
// Slip streams are shared by the two environments and every agent of a world.  Log rows: [step, from, to, kind, success].
// ==========================================================
import { GRAPH, edgeIndex } from '../worlds.mjs';
import { KIND } from '../envsim.mjs';
import { stream, envSlip, envStart } from '../rngid.mjs';
import { pOf } from './states.mjs';

export class AcqEnv {
  constructor(world, env) {
    if (!['E1', 'E2'].includes(env)) throw new Error(`unknown environment ${env}`);
    this.world = world; this.env = env; this.p = pOf(world, env);
    this.slip = GRAPH.edges.map(e => stream(envSlip(world.id, e.i)));
    this.attemptsOnEdge = new Array(GRAPH.edges.length).fill(0);
    this.startRng = stream(envStart(world.id));
    this.nonGoal = GRAPH.nodes.filter(n => n !== world.goal);
    this.log = []; this.refused = 0; this.self = 0;
  }
  attempt(from, to, step) {
    from = Number(from); to = Number(to);
    if (from === to) { this.self++; this.log.push([step, from, to, KIND.SELF, 1]); return true; }
    const e = edgeIndex(from, to);
    if (e === undefined) { this.refused++; this.log.push([step, from, to, KIND.REFUSED, 0]); return false; }
    this.attemptsOnEdge[e]++;
    const ok = this.slip[e]() < this.p[e];
    this.log.push([step, from, to, KIND.EDGE, ok ? 1 : 0]);
    return ok;
  }
  nextStart() { return this.nonGoal[Math.floor(this.startRng() * this.nonGoal.length)]; }
}

// ==========================================================
// CF-01 testbed — GraphEnv: the authoritative environment (handbook §8)
// ==========================================================
// The environment alone holds ground truth: position, topology, reliabilities, blocked edges, the rewarded node and
// the cue.  Agents see only frozen observations { node, nActions, goal }.  All state is in private fields.
//
//   const env = new GraphEnv(world, { seedLabel, maxSteps })
//   env.reset({ start, maxSteps })  -> observation
//   env.step(action)                -> { obs, reward, done, truncated }
// Runner-only controls (never handed to an agent): setRewardNode, setCue, block, unblock, setReliability, trace,
// oracleBestAction, inspect.
//
// Dynamics: action i at node s targets v = exitOrder[s][i]; the attempt succeeds iff the edge is not blocked and
// u < p(edge), where u is the j-th draw of that edge's own stream for this environment instance (common random
// numbers: same draws for every agent run with the same seedLabel).  A draw is consumed on every attempt, blocked or
// not.  On failure the agent stays.  Reward 1 and done on arrival at the rewarded node; the goal edge obeys the same
// dynamics as every other edge (CD-004).  Truncation at maxSteps is distinct from done.
// ==========================================================
import { distancesTo, edgeKey } from './worlds.mjs';
import { makeStream, randInt } from './rng.mjs';

export const OBS_KEYS = Object.freeze(['node', 'nActions', 'goal']);

export class GraphEnv {
  #w; #seedLabel; #maxSteps; #episodeMax;
  #rel = new Map(); #blocked = new Set(); #reward = null; #cue = null;
  #edgeStreams = new Map(); #startStream;
  #pos = null; #t = 0; #episode = -1; #over = true; #log = [];

  constructor(world, { seedLabel, maxSteps = 200 } = {}) {
    if (!seedLabel) throw new Error('GraphEnv needs a seedLabel');
    this.#w = world; this.#seedLabel = seedLabel; this.#maxSteps = maxSteps; this.#episodeMax = maxSteps;
    this.#startStream = makeStream(`${seedLabel}|start`);
  }

  // ---- runner-only controls ----
  setRewardNode(node) { this.#reward = node; }
  setCue(node) { this.#cue = node; }
  block(u, v) { this.#blocked.add(edgeKey(u, v)); }
  unblock(u, v) { this.#blocked.delete(edgeKey(u, v)); }
  setReliability(u, v, p) { if (!(p >= 0 && p <= 1)) throw new RangeError('reliability must be in [0, 1]'); this.#rel.set(edgeKey(u, v), p); }
  trace() { return this.#log.map((r) => [...r]); }
  inspect() { return { pos: this.#pos, t: this.#t, episode: this.#episode, reward: this.#reward, cue: this.#cue, blocked: [...this.#blocked].sort() }; }

  /** Privileged shortest-path action toward the rewarded node on the current true graph (blocked and p = 0 edges removed). */
  oracleBestAction() {
    if (this.#reward === null || this.#pos === null) return null;
    const cut = new Set(this.#blocked);
    for (const [k, p] of this.#rel) if (p === 0) cut.add(k);
    const d = distancesTo(this.#w, this.#reward, cut);
    const exits = this.#w.exitOrder[this.#pos];
    let best = null, bestD = Infinity;
    exits.forEach((v, i) => { if (!cut.has(edgeKey(this.#pos, v)) && d[v] >= 0 && d[v] < bestD) { bestD = d[v]; best = i; } });
    return best;
  }

  // ---- agent-facing interface ----
  reset({ start = null, maxSteps = null } = {}) {
    if (start === null) {
      const pool = Array.from({ length: this.#w.n }, (_, i) => i).filter((i) => i !== this.#reward);
      start = pool[randInt(pool.length, this.#startStream)];
    }
    if (start === this.#reward) throw new Error('an episode may not start at the rewarded node');
    this.#pos = start; this.#t = 0; this.#episode++; this.#over = false;
    this.#episodeMax = maxSteps ?? this.#maxSteps;
    return this.#obs();
  }

  step(action) {
    if (this.#over) throw new Error('step() after the episode ended; call reset()');
    const s = this.#pos;
    const exits = this.#w.exitOrder[s];
    if (!Number.isInteger(action) || action < 0 || action >= exits.length) throw new RangeError(`invalid action ${action} at a node with ${exits.length} exits`);
    const v = exits[action];
    const key = edgeKey(s, v);
    let stream = this.#edgeStreams.get(key);
    if (!stream) { stream = makeStream(`${this.#seedLabel}|edge|${key}`); this.#edgeStreams.set(key, stream); }
    const u = stream();
    const ok = !this.#blocked.has(key) && u < (this.#rel.has(key) ? this.#rel.get(key) : 1);
    if (ok) this.#pos = v;
    this.#t++;
    const reward = ok && this.#reward !== null && this.#pos === this.#reward ? 1 : 0;
    const done = reward > 0;
    const truncated = !done && this.#t >= this.#episodeMax;
    if (done || truncated) this.#over = true;
    this.#log.push([this.#episode, this.#t, s, action, this.#pos, reward]);
    return { obs: this.#obs(), reward, done, truncated };
  }

  #obs() {
    return Object.freeze({ node: this.#w.labelOf[this.#pos], nActions: this.#w.exitOrder[this.#pos].length, goal: this.#cue === null ? null : this.#w.labelOf[this.#cue] });
  }
}

// ==========================================================
// M14 mind — a relational schema over kinds, learned from successful episodes in many worlds
// ==========================================================
// What it learns: for a node of kind k, how likely an exit of kind j is to be the exit the agent took on its way to
// the goal. Nothing in it names a node or a label, so what it learns in one world can apply in another.
//
// Learning, after each episode that reached the goal (never from the world's ground truth):
//   1. take the nodes the agent stood on, in order, and erase loops (chronological loop erasure), leaving the
//      simple path the episode actually made from start to goal;
//   2. at each node u on that path except the goal: for every exit of u, avail[kind(u)][kind behind the exit] += 1,
//      and for the exit the path took, chosen[kind(u)][kind of the next node] += 1.
// Score: score(k, j) = (chosen[k][j] + 1) / (avail[k][j] + 2), the posterior mean under a uniform Beta(1, 1) prior.
//
// freeze() ends learning: a frozen schema throws if asked to learn, so a test world can never write into it.
// fixedSchema(table) builds a schema whose scores are given (the privileged oracle reference in M14).
// ==========================================================

export function loopErase(nodes) {
  const path = [];
  const at = new Map();
  for (const x of nodes) {
    if (at.has(x)) {
      const i = at.get(x);
      for (const y of path.splice(i + 1)) at.delete(y);
    } else { at.set(x, path.length); path.push(x); }
  }
  return path;
}

export function makeKindSchema(nKinds) {
  const zero = () => Array.from({ length: nKinds }, () => new Array(nKinds).fill(0));
  const avail = zero(), chosen = zero();
  let frozen = false, episodes = 0, steps = 0;
  return {
    nKinds,
    learnable: true,
    score: (k, j) => (chosen[k][j] + 1) / (avail[k][j] + 2),
    /** visits: [{ node, kind, exitKinds }] in the order the agent stood on them, ending at the goal. */
    learnEpisode(visits) {
      if (frozen) throw new Error('a frozen schema cannot learn');
      const info = new Map(visits.map((v) => [v.node, v]));
      const path = loopErase(visits.map((v) => v.node));
      for (let i = 0; i + 1 < path.length; i++) {
        const u = info.get(path[i]), w = info.get(path[i + 1]);
        for (const j of u.exitKinds) avail[u.kind][j]++;
        chosen[u.kind][w.kind]++;
        steps++;
      }
      episodes++;
    },
    freeze() { frozen = true; },
    isFrozen: () => frozen,
    snapshot: () => ({ nKinds, episodes, steps, avail: avail.map((r) => [...r]), chosen: chosen.map((r) => [...r]), frozen }),
  };
}

export function fixedSchema(table) {
  const nKinds = table.length;
  return {
    nKinds,
    learnable: false,
    score: (k, j) => table[k][j],
    learnEpisode() { throw new Error('a fixed schema cannot learn'); },
    freeze() {},
    isFrozen: () => true,
    snapshot: () => ({ nKinds, fixed: table.map((r) => [...r]), frozen: true }),
  };
}

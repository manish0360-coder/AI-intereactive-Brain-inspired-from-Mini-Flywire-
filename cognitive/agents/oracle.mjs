// ==========================================================
// ORACLE — privileged upper-bound reference (never a learner; results labelled ORACLE)
// ==========================================================
// Declares privileged: true, so the runner hands it oracle.bestAction(): the shortest-path exit toward the true
// rewarded node on the true current graph.  With no rewarded node it acts uniformly at random.
// ==========================================================
export function makeOracle({ rng, oracle }) {
  if (!oracle) throw new Error('ORACLE needs the privileged channel');
  return {
    kind: 'ORACLE',
    privileged: true,
    act(obs) { const a = oracle.bestAction(); return a === null ? Math.floor(rng() * obs.nActions) : a; },
    observe() {},
  };
}

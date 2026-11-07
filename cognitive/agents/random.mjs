// ==========================================================
// RANDOM — uniform over the exits of the current node (floor reference)
// ==========================================================
export function makeRandom({ rng }) {
  return {
    kind: 'RANDOM',
    act(obs) { return Math.floor(rng() * obs.nActions); },
    observe() {},
  };
}

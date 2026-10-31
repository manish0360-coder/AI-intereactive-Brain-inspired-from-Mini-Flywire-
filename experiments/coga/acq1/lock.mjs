// ==========================================================
// ACQ-1 — confirmatory lock.  null until the protocol freeze records the frozen allocation in its own commit.
// ==========================================================
// When set: Object.freeze({ freezeCommit, protocolSha256, delta, n, steps, window, variants, allocation: [{ index, configSeed, goal }], authorizedBy, date })
export const ACQ_AUTHORIZATION = null;

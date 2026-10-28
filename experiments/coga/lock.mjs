// ==========================================================
// COG-A — confirmatory lock.  null until the protocol freeze (M-COGA-5) records the frozen allocation in a separate commit.
// ==========================================================
// When set: Object.freeze({ freezeCommit, designSha256, decisionTableSha256, powerSha256, delta, qMin, n, indices: [...], authorizedBy, date })
export const CONFIRMATORY_AUTHORIZATION = null;

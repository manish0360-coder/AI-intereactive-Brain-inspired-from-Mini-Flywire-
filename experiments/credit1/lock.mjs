// ==========================================================
// CREDIT-1 — session lock
// ==========================================================
// Stage L (owner authorization of 2026-10-25, recorded in a commit of its own): the session lock holds the calibration-only
// record below.  Only development calibration is in scope: XFER-1 development worlds 0-29, the 9 cells, the development
// procedures; the A+ module, confirmatory territory and every other session remain refused.  The runtime calibration (Stage C)
// starts only on the owner's explicit confirmation after the checkpoint report.
// The driver calls assertSessionAuthorized() before it reads its input, and assertSessionScope() for every session input before
// any runtime module is loaded.  The only non-null value the gate accepts is a record with exactly the scope below.
// ==========================================================
export const CALIBRATION_SCOPE = Object.freeze({
  kind: 'DEVELOPMENT_CALIBRATION',
  worlds: Object.freeze({ lo: 0, hi: 29 }),                                   // XFER-1 development worlds 0-29 (CALIBRATION_PROTOCOL section 1)
  cells: Object.freeze(['T_L', 'T_A', 'N0L', 'N1L', 'N0A', 'N1A', 'N1AX', 'N1LX', 'N1A_noQ']),   // the 9 cells; the A+ module cells are not in scope
  procedures: Object.freeze(['D2_ALIGNED_FALSE', 'MAP_ON_PARITY', 'D2_MAP_ON_PARITY']),          // development-only parity procedures (D-2, D-1c map on)
  aPlus: false,
});
// development-only procedures: the cells each may run on, and what they change (nothing else differs from the cell)
//   SWAP_PARITY_OWNPATH (swap-parity check, Gemini round 3): an own-store cell receives a byte copy of the training export of
//   world pi(w) through the normal own-store path (brainWorld = w); input storeSourceWorld must be pi(w).  It is authorized only
//   by SWAP_PARITY_AUTHORIZATION, never by the calibration record.
export const PROCEDURES = Object.freeze({
  D2_ALIGNED_FALSE: Object.freeze({ cells: Object.freeze(['T_L', 'N0L', 'N1L']), alignedFalse: true, mapOn: false }),
  MAP_ON_PARITY: Object.freeze({ cells: Object.freeze(['N0L']), alignedFalse: false, mapOn: true }),
  D2_MAP_ON_PARITY: Object.freeze({ cells: Object.freeze(['N0L']), alignedFalse: true, mapOn: true }),
  SWAP_PARITY_OWNPATH: Object.freeze({ cells: Object.freeze(['N1A', 'N1L']), alignedFalse: false, mapOn: false, ownPathCopy: true }),
  //   TIMING_DIAGNOSTIC (TIMING_DIAGNOSTIC_PLAN.md): the cell's own session, unchanged, under the clock preload (clock.mjs); authorized
  //   only by TIMING_DIAGNOSTIC_AUTHORIZATION, never by the calibration or swap-parity record.
  TIMING_DIAGNOSTIC: Object.freeze({ cells: Object.freeze(['T_A', 'T_L', 'N0A', 'N1A', 'N0L', 'N1L', 'N1AX', 'N1LX']), alignedFalse: false, mapOn: false, timingDiagnostic: true }),
});
export const CONFIRMATORY_START = 2032;                                       // config.TERRITORY.confirmatoryStart
// the swap-parity check: development worlds 0-9 and their pi sources (0-10), the cells it runs, the own-path procedure, A+ excluded
export const SWAP_PARITY_SCOPE = Object.freeze({
  kind: 'SWAP_PARITY_CHECK',
  worlds: Object.freeze({ lo: 0, hi: 10 }),
  cells: Object.freeze(['T_A', 'T_L', 'N1AX', 'N1LX', 'N1A', 'N1L']),
  procedures: Object.freeze(['SWAP_PARITY_OWNPATH']),
  aPlus: false,
});
// AUTHORIZED by the owner on 2026-10-27, recorded in this commit of its own: the 60-session swap-parity check, nothing else
export const SWAP_PARITY_AUTHORIZATION = Object.freeze({ ...SWAP_PARITY_SCOPE, authorizedBy: 'owner', authorizedOn: '2026-10-27', stage: 'SWAP',
  note: 'development-only swap-parity check (60 sessions, worlds 0-10); establishes delivery-path equivalence only' });

// the timing diagnostic (T-build, owner authorization of 2026-10-28: build only, no session): the ten development worlds of its plan
// (the five divergent swap sessions, their store sources and the primary cells), its eight cells, its one procedure, A+ excluded,
// and the hash of the preregistered plan document.  NOT AUTHORIZED: the record stays null until the owner authorizes the run.
export const TIMING_DIAGNOSTIC_SCOPE = Object.freeze({
  kind: 'TIMING_DIAGNOSTIC',
  worlds: Object.freeze([2, 3, 6, 7, 14, 15, 21, 22, 25, 26]),
  cells: Object.freeze(['T_A', 'T_L', 'N0A', 'N1A', 'N0L', 'N1L', 'N1AX', 'N1LX']),
  procedures: Object.freeze(['TIMING_DIAGNOSTIC']),
  aPlus: false,
  planDocSha256: '98d41aaaf322432648e37ebb57b3130cb2bf243a8c7c51fae9bda33460954789',
});
export const TIMING_DIAGNOSTIC_AUTHORIZATION = null;

export const SESSION_AUTHORIZATION = Object.freeze({ ...CALIBRATION_SCOPE, authorizedBy: 'owner', authorizedOn: '2026-10-25', stage: 'L',
  note: 'development calibration only; the runtime calibration (Stage C) starts only on the owner\'s explicit confirmation' });
export const A_PLUS_MODULE_AUTHORIZATION = null;

export function assertSessionAuthorized() {
  if (SESSION_AUTHORIZATION === null) throw new Error('CREDIT-1 session refused: no session is authorized (development calibration needs the owner\'s separate authorization)');
}
export function assertAPlusAuthorized() {
  if (A_PLUS_MODULE_AUTHORIZATION === null) throw new Error('CREDIT-1 session refused: the A+ module is not authorized');
}

/** an authorization record is accepted only if its scope fields equal CALIBRATION_SCOPE exactly */
export function calibrationRecordProblems(auth) {
  if (auth === null || typeof auth !== 'object') return ['no session is authorized'];
  const p = [];
  for (const k of Object.keys(CALIBRATION_SCOPE)) if (JSON.stringify(auth[k]) !== JSON.stringify(CALIBRATION_SCOPE[k])) p.push(`authorization field ${k} is not the calibration-only scope`);
  return p;
}

/** pure: why one session input is outside the authorization (empty = inside) */
export function scopeProblems(auth, { world, cell, procedure } = {}) {
  const p = calibrationRecordProblems(auth);
  if (p.length) return p;
  if (!Number.isInteger(world)) p.push('world must be an integer');
  else if (world >= CONFIRMATORY_START) p.push(`world ${world} is confirmatory territory (from ${CONFIRMATORY_START})`);
  else if (world < auth.worlds.lo || world > auth.worlds.hi) p.push(`world ${world} is outside development worlds ${auth.worlds.lo}-${auth.worlds.hi}`);
  if (!auth.cells.includes(cell)) p.push(`cell ${cell} is not in the calibration scope${auth.aPlus === false ? ' (A+ excluded)' : ''}`);
  if (procedure !== undefined) {
    if (!auth.procedures.includes(procedure) || !PROCEDURES[procedure]) p.push(`procedure ${procedure} is not authorized`);
    else if (!PROCEDURES[procedure].cells.includes(cell)) p.push(`procedure ${procedure} does not run on cell ${cell}`);
  }
  return p;
}
/** a swap-parity record is accepted only if its scope fields equal SWAP_PARITY_SCOPE exactly */
export function swapParityRecordProblems(auth) {
  if (auth === null || typeof auth !== 'object') return ['the swap-parity check is not authorized'];
  const p = [];
  for (const k of Object.keys(SWAP_PARITY_SCOPE)) if (JSON.stringify(auth[k]) !== JSON.stringify(SWAP_PARITY_SCOPE[k])) p.push(`authorization field ${k} is not the swap-parity scope`);
  return p;
}
/** pure: why one SWAP_PARITY_OWNPATH session input is outside the swap-parity authorization (empty = inside) */
export function swapScopeProblems(auth, { world, cell, procedure } = {}) {
  const p = swapParityRecordProblems(auth);
  if (p.length) return p;
  if (!Number.isInteger(world)) p.push('world must be an integer');
  else if (world >= CONFIRMATORY_START) p.push(`world ${world} is confirmatory territory (from ${CONFIRMATORY_START})`);
  else if (world < auth.worlds.lo || world > auth.worlds.hi) p.push(`world ${world} is outside the swap-parity worlds ${auth.worlds.lo}-${auth.worlds.hi}`);
  if (!auth.cells.includes(cell)) p.push(`cell ${cell} is not in the swap-parity scope (A+ excluded)`);
  if (!auth.procedures.includes(procedure) || !PROCEDURES[procedure] || !PROCEDURES[procedure].ownPathCopy) p.push(`procedure ${procedure} is not the swap-parity procedure`);
  else if (!PROCEDURES[procedure].cells.includes(cell)) p.push(`procedure ${procedure} does not run on cell ${cell}`);
  return p;
}
/** a timing-diagnostic record is accepted only if its scope fields equal TIMING_DIAGNOSTIC_SCOPE exactly */
export function timingDiagnosticRecordProblems(auth) {
  if (auth === null || typeof auth !== 'object') return ['the timing diagnostic is not authorized'];
  const p = [];
  for (const k of Object.keys(TIMING_DIAGNOSTIC_SCOPE)) if (JSON.stringify(auth[k]) !== JSON.stringify(TIMING_DIAGNOSTIC_SCOPE[k])) p.push(`authorization field ${k} is not the timing-diagnostic scope`);
  return p;
}
/** pure: why one TIMING_DIAGNOSTIC session input is outside the timing-diagnostic authorization (empty = inside) */
export function timingDiagnosticScopeProblems(auth, { world, cell, procedure } = {}) {
  const p = timingDiagnosticRecordProblems(auth);
  if (p.length) return p;
  if (!Number.isInteger(world)) p.push('world must be an integer');
  else if (world >= CONFIRMATORY_START) p.push(`world ${world} is confirmatory territory (from ${CONFIRMATORY_START})`);
  else if (!auth.worlds.includes(world)) p.push(`world ${world} is not a timing-diagnostic world`);
  if (!auth.cells.includes(cell)) p.push(`cell ${cell} is not in the timing-diagnostic scope (A+ excluded)`);
  if (!auth.procedures.includes(procedure) || !PROCEDURES[procedure] || !PROCEDURES[procedure].timingDiagnostic) p.push(`procedure ${procedure} is not the timing-diagnostic procedure`);
  else if (!PROCEDURES[procedure].cells.includes(cell)) p.push(`procedure ${procedure} does not run on cell ${cell}`);
  return p;
}
/** the own-path procedure is checked against the swap-parity authorization, the timing diagnostic against its own; every other session against the calibration record */
export function assertSessionScope(input) {
  const proc = input && input.procedure;
  const p = proc === 'SWAP_PARITY_OWNPATH' ? swapScopeProblems(SWAP_PARITY_AUTHORIZATION, input)
    : proc === 'TIMING_DIAGNOSTIC' ? timingDiagnosticScopeProblems(TIMING_DIAGNOSTIC_AUTHORIZATION, input) : scopeProblems(SESSION_AUTHORIZATION, input);
  if (p.length) throw new Error(`CREDIT-1 session refused: ${p.join('; ')}`);
}

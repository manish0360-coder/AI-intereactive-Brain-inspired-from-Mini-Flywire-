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
export const PROCEDURES = Object.freeze({
  D2_ALIGNED_FALSE: Object.freeze({ cells: Object.freeze(['T_L', 'N0L', 'N1L']), alignedFalse: true, mapOn: false }),
  MAP_ON_PARITY: Object.freeze({ cells: Object.freeze(['N0L']), alignedFalse: false, mapOn: true }),
  D2_MAP_ON_PARITY: Object.freeze({ cells: Object.freeze(['N0L']), alignedFalse: true, mapOn: true }),
});
export const CONFIRMATORY_START = 2032;                                       // config.TERRITORY.confirmatoryStart

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
export function assertSessionScope(input) {
  const p = scopeProblems(SESSION_AUTHORIZATION, input);
  if (p.length) throw new Error(`CREDIT-1 session refused: ${p.join('; ')}`);
}

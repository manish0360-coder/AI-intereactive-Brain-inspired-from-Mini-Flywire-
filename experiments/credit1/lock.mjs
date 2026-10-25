// ==========================================================
// CREDIT-1 — session lock
// ==========================================================
// No CREDIT-1 session of any kind (development calibration, smoke, confirmatory) is authorized.  The driver calls
// assertSessionAuthorized() before it reads its input or loads any runtime module, so it refuses while this is null.
// Changing it requires the owner's separate, explicit authorization, recorded in a commit of its own.
// ==========================================================
export const SESSION_AUTHORIZATION = null;
export const A_PLUS_MODULE_AUTHORIZATION = null;

export function assertSessionAuthorized() {
  if (SESSION_AUTHORIZATION === null) throw new Error('CREDIT-1 session refused: no session is authorized (development calibration needs the owner\'s separate authorization)');
}
export function assertAPlusAuthorized() {
  if (A_PLUS_MODULE_AUTHORIZATION === null) throw new Error('CREDIT-1 session refused: the A+ module is not authorized');
}

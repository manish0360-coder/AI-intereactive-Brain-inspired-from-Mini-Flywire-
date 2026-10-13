// ==========================================================
// MCF-1 — the committed authorization pin (DATA ONLY)
// ==========================================================
// This module holds exactly two declarations, in this order, and nothing else.
//
// FREEZE_RECORD_SHA256 - the SHA-256 of the freeze record that authorises official stages.
//   null                no freeze record is authorised; every official path refuses at its first guard
//   64 lowercase hex    the canonical-JSON hash of experiments/mcf1/freeze_record.json
//
// SCAN_AUTHORIZATION - the one window the candidate admission scan may cover (M-SCAN-1).
//   null                no scan is authorised; the candidate window cannot be scanned by any route
//   { start: N, length: N }   exactly the candidate window named in config.mjs; anything else is refused
//   It authorises an arithmetic admission scan only: no agent run, no registration, no official stage.
//
// It is deliberately a separate, logic-free module.  The freeze record binds the digest of every runtime source
// file, and the pin is the hash of that record, so a pin inside a hashed file would be a cycle.  The pin file is
// therefore the one runtime-adjacent file that is NOT in the source digest, and for that reason it may contain
// nothing but these two declarations: lock.mjs refuses to authorise (and refuses to scan) when the file is anything
// else, and the verifiers check the same template.  The logic that reads them lives in lock.mjs, which IS in the
// source digest.
//
// Only a separate, explicitly authorised commit may change either value: the pin after the preregistration, the
// registered block and the freeze record exist; the scan authorization by the user's explicit decision.  Neither is
// read from the environment, a flag or a caller argument.
// ==========================================================
export const FREEZE_RECORD_SHA256 = null;
export const SCAN_AUTHORIZATION = null;

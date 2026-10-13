// ==========================================================
// MCF-1 — the committed authorization pin (DATA ONLY)
// ==========================================================
// This module holds exactly one value: the SHA-256 of the freeze record that authorises official stages.
//
//   null                no freeze record is authorised; every official path refuses at its first guard
//   64 lowercase hex    the canonical-JSON hash of experiments/mcf1/freeze_record.json
//
// It is deliberately a separate, logic-free module.  The freeze record binds the digest of every runtime source
// file, and the pin is the hash of that record, so a pin inside a hashed file would be a cycle.  The pin file is
// therefore the one runtime-adjacent file that is NOT in the source digest, and for that reason it may contain
// nothing but this declaration: lock.mjs refuses to authorise when the file is anything else, and the verifier
// (G39) checks the same template.  The logic that reads the pin lives in lock.mjs, which IS in the source digest.
//
// Only a separate, explicitly authorised commit may change this value, after the preregistration, the registered
// block and the freeze record exist.  It is not read from the environment, a flag or a caller argument.
// ==========================================================
export const FREEZE_RECORD_SHA256 = null;

// ==========================================================
// PATH SHIM — TEST INFRASTRUCTURE ONLY
// ==========================================================
// baseline/scoring_prerect.js is a BYTE-IDENTICAL frozen copy of
// render/scoring.js as it stood immediately before the G16 trust
// rectification. Because it is byte-identical, it still carries the
// import that render/scoring.js uses:
//
//     import { liveRng } from "../instrumentation/rng.js";
//
// From experiments/phase1_0/baseline/ that resolves here. This file
// re-exports the REAL instrumentation module so the reference arm can
// be loaded WITHOUT editing it — preserving byte-identity, which is
// what makes the G16.4 "exactly one line differs" audit meaningful.
//
// It has no behaviour of its own: `export *` re-exports from the same
// module URL, so there is exactly one rng.js instance, not two.
//
// NOT imported by the application.
// ==========================================================
export * from '../../../instrumentation/rng.js';

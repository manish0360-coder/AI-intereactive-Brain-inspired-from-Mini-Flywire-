// ==========================================================
// ACQ-1 — study constants (the single home of every fixed value; DESIGN.md section 12)
// ==========================================================
export const SCHEMA = 'coga/acq1';
export const STEPS = 12000;                     // interaction budget per session
export const WINDOW = Object.freeze([9000, 12000]);   // the evaluation window (the last quarter of the session)
export const CURVE_WINDOW = 3000;               // learning-curve bins (secondary)
export const DELTA = 0.10;                      // smallest effect of interest on psi (DESIGN.md section 8)
export const DELTA_SENSITIVITY = Object.freeze([0.05, 0.15]);
export const QB1_PARAMS = Object.freeze({ alpha: 0.5, epsilon: 0.10 });   // tuned on phase-I performance, development worlds (../evidence/tuning_dev.json)
export const BOOTSTRAP = Object.freeze({ replicates: 10000, seed: 20261031, level: 0.95, secondaryLevel: 0.975 });
export const VOID_SHARE_MAX = 0.05;
export const DETERMINISM_SHARE = 0.10;          // share of confirmatory worlds re-run for byte identity
export const MFW_VARIANTS = Object.freeze(['P', 'A', 'H']);   // P is the agent of the primary question; A and H are prespecified secondary arms

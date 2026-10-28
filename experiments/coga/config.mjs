// ==========================================================
// COG-A — study constants (single home of every fixed value; DESIGN.md §13)
// ==========================================================
export const SCHEMA = 'coga/1';
export const STEPS = 3000;              // interaction budget per session (M7 RUN_TICKS)
export const T_SHIFT = 1500;            // first phase-II step under SWAP (M7 T_SHIFT)
export const EPISODE_CAP = 150;         // steps per episode (M7 EPISODE_CAP; main.js M7_EPISODE_TICK_CAP)
export const GAMMA = 0.95;              // a priori (census rule, 8740c06)
export const KAPPA = 0.10;              // selected by the pre-declared census rule (evidence/census_dev.json)
export const K_DIST = 1;                // second-stage acceptance: at least one DISTAL state
export const W_TIME = 150;              // M3 time-matching window
export const DYNA_K = 5;                // Dyna-Q planning updates per real step (preregistered cap)
export const TUNING_GRID = Object.freeze({ alpha: [0.1, 0.3, 0.5], epsilon: [0.05, 0.10, 0.20] });
export const BOOTSTRAP = Object.freeze({ replicates: 10000, seed: 20261029, level: 0.95 });
export const VOID_WORLD_SHARE_MAX = 0.05;

// territory (DESIGN.md §9)
export const STUDY_STREAM_START = 200000;   // the accepted-configuration stream of XFER-1 / LEARN-0 / CREDIT-1
export const DEV_INDICES = Object.freeze({ lo: 0, hi: 29 });
export const CONFIRMATORY_FROM = 3240;       // after CREDIT-1's reserved 2032-3239
export const SIM_STREAM_START = 150000;      // development-simulation stream (below the study stream; 100000 avoided: MCF-1)
export const RESERVED_INDEX_RANGES = Object.freeze([
  Object.freeze({ lo: 0, hi: 1391, who: 'earlier GATE-FLOOR / XFER studies (dev worlds 0-29 reused by COG-A for development only)' }),
  Object.freeze({ lo: 1392, hi: 1671, who: "GATE-FLOOR-SCOPE C' (reserved)" }),
  Object.freeze({ lo: 1672, hi: 2031, who: 'LEARN-0 block L' }),
  Object.freeze({ lo: 2032, hi: 3239, who: 'CREDIT-1 confirmatory reservation (paused)' }),
]);
export const REGISTRY_CONSUMED = Object.freeze({ lo: 886000, hi: 900499 });
export const HELDOUT_FLOOR = 900500;

// MFW procedure
export const MFW_HOOKS = Object.freeze({ arm: 'OFF', envMode: 'off', creditMode: 'off', pin: 'off' });   // hook state P; the COG-A env is installed by the driver
export const CLOCK = Object.freeze({ mode: 'VIRTUAL', t0: 1767225600000, delayMs: 500 });              // Variant C (credit1/clock.mjs T0A)

// ==========================================================
// H1-R CLI gate — TEST DOUBLE for the B2 tree's experiments/m7/env.js
// ==========================================================
// Used only inside verify_cli.mjs sandboxes (copied to <sandbox>/tree/experiments/m7/env.js). A synthetic
// acceptance rule over integers: no M7 configuration is generated and no M7 generator code runs. Every
// makeConfig call appends its seed to <sandbox>/tree/makeConfig.log, so the gate can show which stream
// positions the CLI path asked for (never the held-out stream from 900500).
//   H1R_CLI_DOUBLE_ACCEPT_NONE=1   no seed is accepted (drives the v1.0 §7.1 PILOT_HARD_BOUND halt)
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LOG = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'makeConfig.log');
const GOALS = [8, 12, 16, 19];

export function makeConfig(seed, index) {
  fs.appendFileSync(LOG, `${seed}\n`);
  const accepted = process.env.H1R_CLI_DOUBLE_ACCEPT_NONE ? false : seed % 3 === 1;
  return { accepted, goal: GOALS[index % GOALS.length], pPhase1: [0.25, 0.5, 0.75], pPhase2: [0.75, 0.5, 0.25] };
}

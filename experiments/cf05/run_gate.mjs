// ==========================================================
// CF-05 — the exploration bonus (criteria in experiments/cf05/GATE_SPEC.md; driver in gate_lib.mjs)
// ==========================================================
//   node experiments/cf05/run_gate.mjs --domain dev   --out <file outside the repository> [--worlds N] [--large-worlds N]
//   node experiments/cf05/run_gate.mjs --domain gate5
// Primary mechanism: BONUS (kappa * sqrt(tau) added to the planned value of every tried pair).  The targeted RECALL
// candidate is NOT in this gate; it has its own (experiments/cf05b).
// ==========================================================
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runGate } from './gate_lib.mjs';

export const CONFIG = Object.freeze({
  id: 'cf05', here: path.dirname(fileURLToPath(import.meta.url)), gateDomain: 'gate5',
  gateWorlds: 60,                                      // fixed before the gate5 run; see GATE_SPEC.md
  primary: 'BONUS',
  arms: Object.freeze({                                // settings fixed on the dev domain by the rule in GATE_SPEC.md
    ORACLE: ['ORACLE', {}],
    MBVI3: ['MBVI3', {}],
    BONUS: ['MBVI4_BONUS', { kappa: 0.001 }],
    BONUS_K003: ['MBVI4_BONUS', { kappa: 0.003 }],     // a stronger bonus (reported)
    DECAY: ['MBVI4_DECAY', { hazard: 0.0003 }],        // blanket belief decay (reported)
    DYNAQ: ['DYNAQ', {}],
    DYNAQP: ['DYNAQP', { kappa: 0.001 }],
    DYNAQP_MATCHED: ['DYNAQP_MATCHED', { kappa: 0.001 }],
    MBVI3_CH0005: ['MBVI3', { changeHazard: 0.0005 }], // change-detection prior rate 4x lower (reported)
    MBVI3_CH008: ['MBVI3', { changeHazard: 0.008 }],   // change-detection prior rate 4x higher (reported)
  }),
  r6: Object.freeze(['DYNAQP', 'DYNAQP_MATCHED']),
  large: Object.freeze({ worlds: 20, nodes: 48, edges: 60, exploreSteps: 1200, arms: Object.freeze(['ORACLE', 'MBVI3', 'BONUS']) }),
  cleanPaths: Object.freeze(['cognitive', 'experiments/cf05']),
});

await runGate(CONFIG);

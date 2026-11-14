// ==========================================================
// CF-05b — targeted recall (criteria in experiments/cf05b/GATE_SPEC.md; driver in ../cf05/gate_lib.mjs)
// ==========================================================
//   node experiments/cf05b/run_gate.mjs --domain dev    --out <file outside the repository> [--worlds N] [--large-worlds N]
//   node experiments/cf05b/run_gate.mjs --domain gate5b
// Primary mechanism: RECALL (remember exits the model declared worse; let the planning belief drift back).
// Two DIAGNOSTIC arms are told which edge the task manipulated (ground truth; privileged; reported only):
//   RECALL_REALONLY   remembers a declared change only if that edge is really blocked at that moment
//   RECALL_FALSEONLY  remembers it only if it is not (a false alarm of the change detector)
// ==========================================================
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runGate } from '../cf05/gate_lib.mjs';

export const CONFIG = Object.freeze({
  id: 'cf05b', here: path.dirname(fileURLToPath(import.meta.url)), gateDomain: 'gate5b',
  gateWorlds: 40,                                      // fixed before the gate5b run; see GATE_SPEC.md
  primary: 'RECALL',
  arms: Object.freeze({                                // hazard selected on the tune5b domain by the rule in GATE_SPEC.md
    ORACLE: ['ORACLE', {}],
    MBVI3: ['MBVI3', {}],
    RECALL: ['MBVI4_RECALL', { hazard: 0.01 }],
    RECALL_H003: ['MBVI4_RECALL', { hazard: 0.003 }],  // sensitivity (reported)
    RECALL_H03: ['MBVI4_RECALL', { hazard: 0.03 }],    // sensitivity (reported)
    RECALL_REALONLY: ['MBVI4_RECALL', { hazard: 0.01 }, { diagnostic: 'real' }],
    RECALL_FALSEONLY: ['MBVI4_RECALL', { hazard: 0.01 }, { diagnostic: 'false' }],
    DYNAQP: ['DYNAQP', { kappa: 0.001 }],
    DYNAQP_MATCHED: ['DYNAQP_MATCHED', { kappa: 0.001 }],
  }),
  r6: Object.freeze(['DYNAQP', 'DYNAQP_MATCHED']),
  large: Object.freeze({ worlds: 20, nodes: 48, edges: 60, exploreSteps: 1200, arms: Object.freeze(['ORACLE', 'MBVI3', 'RECALL']) }),
  cleanPaths: Object.freeze(['cognitive', 'experiments/cf05', 'experiments/cf05b']),
});

await runGate(CONFIG);

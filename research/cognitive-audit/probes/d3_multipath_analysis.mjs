// Why stressState and curiosityState are multi-path, and what S1.3 must actually assert.
console.log("stressState enters finalWeight by TWO paths:");
console.log("  direct   : + stressState * 0.4                        =  +0.400");
console.log("  indirect : dynamicFocus includes stressSuppression = stressState*0.7 (scoring.js:209)");
console.log("             dynamicFocus enters as  - dynamicFocus*0.25");
console.log("             => -0.25 * (-0.7) = +0.175");
console.log("  total observed = 0.400 + 0.175 = 0.575   <- matches Phase 0 Probe C exactly\n");
console.log("  After correcting ONLY the direct term: -0.400 + 0.175 = -0.225  (observed -0.2250) OK");
console.log("  => |d| is NOT preserved for multi-path variables. S1.3 as originally written is WRONG.\n");
console.log("curiosityState enters by TWO paths:");
console.log("  direct   : - curiosityState * 0.8");
console.log("  stochastic: drift = (rng()-0.5)*curiosityState*0.06, subtracted; E[drift]=0 but single-sample noise != 0");
console.log("  => S1.3 must average over >= 20k draws for curiosityState, or hold rng fixed.\n");
console.log("fatigueState also multi-path: -0.35 direct, and dynamicFocus includes fatigueSuppression=fatigueState*0.9");
console.log("  => -0.25 * (-0.9) = +0.225 ; total = -0.35 + 0.225 = -0.125  (Phase 0 measured -0.1250) OK");

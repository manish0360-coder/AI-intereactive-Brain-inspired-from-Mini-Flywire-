import { generateExpectation, evaluatePredictionError, getRollingError, uncertaintyState } from '/tmp/mfw/render/predictionError.js';
import * as PE from '/tmp/mfw/render/predictionError.js';

// Replicate main.js exactly.
// runPrediction (main.js:2843-2887): predicted* are computed from window.lastReasoning
// runAgent      (main.js:3782-3789): actual*    are computed from THE SAME window.lastReasoning
const rewards = new Map([['5->6', 6],['6->8',3]]);
const embSim  = (a,b)=> ({'5->6':0.42,'6->8':0.18}[a+'->'+b] ?? 0.05);
const goal = 16;
let comps=[], rpe=[], spe=[], sem=[], gpe=[];
const pairs=[[5,6],[6,8],[8,9],[9,11],[5,6]];
for (const [from,to] of pairs){
  const predSim   = embSim(from,to);                 // main.js:2853
  const predReward= rewards.get(from+'->'+to) || 0;  // main.js:2858
  generateExpectation({predictedNextId: to, predictedReward: predReward,
    predictedSimilarity: predSim, predictedConfidence: 8,
    predictedGoalProgress: (goal && to===goal)?3:0, fromKey: from});

  // ---- runAgent side ----
  const sim = embSim(from,to);                       // main.js:3318 same embeddings, same pair
  let rewardSignal;                                  // main.js:3707-3743
  if (to === goal) rewardSignal = 12;
  else if (sim > 0.45) rewardSignal = 2;
  else if (sim > 0.15) rewardSignal = 0.3;
  else rewardSignal = -0.4;
  const pe = evaluatePredictionError({actualNextId: to, actualReward: rewardSignal,
    actualSimilarity: sim, actualGoalProgress: (to===goal)?3:0});
  comps.push(pe.compositeError);
  // recover components
  spe.push(String(to)===String(to)?0:1);
  sem.push(Math.abs(predSim-sim)/2);
  gpe.push(Math.abs(((goal&&to===goal)?3:0)-((to===goal)?3:0))/5);
  rpe.push(Math.min(Math.abs(predReward-rewardSignal)/6,1));
}
console.log('step | statePE | semanticPE | goalPE | rewardPE | composite');
pairs.forEach((p,i)=>console.log(`${p[0]}->${p[1]}  |  ${spe[i].toFixed(3)}  |   ${sem[i].toFixed(3)}    | ${gpe[i].toFixed(3)}  |  ${rpe[i].toFixed(3)}   | ${comps[i].toFixed(3)}`));
console.log('\nstatePredictionError is 0 in every step; semanticPE 0; goalPE 0.');
console.log('compositeError == 0.40 * rewardPredictionError exactly:',
  comps.every((c,i)=>Math.abs(c-0.4*rpe[i])<1e-12));
console.log('\nrewardPredictionError = |rewards.get(from->to) - f(similarity(from,to))| / 6');
console.log('  -> both operands are read from internal memory at the same instant;');
console.log('     neither is an observation of an outcome.');

import * as scoring from '/tmp/mfw/render/scoring.js';
import { arbitrate } from '/tmp/mfw/render/executiveController.js';

// replicate main.js:2107-2143 exactly
function scoreCandidate(ctx, execW, uncertaintyScoreValue, isSelfLoop){
  const finalWeight = scoring.calculateDecisionScore({...ctx, executiveWeights: execW, uncertaintyScore: uncertaintyScoreValue});
  const arb = scoring.lastArbitrationBreakdown;
  let arbitrated = finalWeight;
  if (arb && execW) {
    const competitive = arbitrate({
      rewardScore: arb.rewardScore, semanticScore: arb.semanticScore,
      confidenceScore: arb.confidenceScore, uncertaintyScore: uncertaintyScoreValue,
      curiosityScore: arb.curiosityScore, costScore: arb.costScore,
      executiveWeights: execW, drift: 0, isSelfLoop});
    arbitrated = finalWeight * 0.60 + competitive * 0.40;
  }
  return {finalWeight, arbitrated};
}
const ew = {wReward:0.35,wSemantic:0.15,wConfidence:0.20,wUncertainty:0.10,wCuriosity:0.10,wCost:0.10};
const rnd=(a,b)=>a+Math.random()*(b-a);
function ctx(){return {transitionBoost:rnd(0,6),qValue:rnd(0,6),reward:rnd(0,8),habitBoost:rnd(0,7),
 curiosityBoost:rnd(0,0.1),chainReward:0,meaningBoost:rnd(0,0.02),futureBonus:0,boredomPenalty:rnd(0,3),
 repetitionPenalty:0,localConfidence:rnd(0,2),localStress:rnd(0,2),localFatigue:rnd(0,1),localTrust:rnd(0,2),
 localFear:rnd(0,1),curiosityState:0.3,confidenceState:8,stressState:10,fatigueState:35,focusState:1,
 dangerPenalty:rnd(0,4),selfLoopPenalty:0,bayesianTrust:rnd(0.3,0.9),goalGradientBoost:0,schemaBonus:0,
 trajectoryIntegrity:rnd(0,1),semanticVitalityScore:rnd(0,2),noiseSuppressedScore:rnd(-2,3),
 consolidationBonus:rnd(0,2),attentionAmplifiedScore:rnd(0,30),dominantDrive:'boredom'};}
let flips=0, N=20000, spreadF=[], spreadA=[];
for(let t=0;t<N;t++){
  const cands=[ctx(),ctx(),ctx(),ctx()];
  const s=cands.map(c=>scoreCandidate(c,ew,0.3,false));
  const iF=s.reduce((b,_,i)=>s[i].finalWeight>s[b].finalWeight?i:b,0);
  const iA=s.reduce((b,_,i)=>s[i].arbitrated>s[b].arbitrated?i:b,0);
  if(iF!==iA) flips++;
  const fs=s.map(x=>x.finalWeight), as=s.map(x=>x.arbitrated);
  spreadF.push(Math.max(...fs)-Math.min(...fs));
  const comp=s.map((x,i)=>(x.arbitrated-x.finalWeight*0.6)/0.4);
  spreadA.push(Math.max(...comp)-Math.min(...comp));
}
const m=a=>a.reduce((x,y)=>x+y,0)/a.length;
console.log(`argmax changed by the 40% arbitrate blend: ${flips}/${N} = ${(100*flips/N).toFixed(2)}%`);
console.log(`mean spread of calculateDecisionScore across 4 candidates: ${m(spreadF).toFixed(2)}`);
console.log(`mean spread of arbitrate() competitiveScore across same 4: ${m(spreadA).toFixed(2)}`);
console.log(`→ arbitrate contributes 0.4 x ${m(spreadA).toFixed(2)} = ${(0.4*m(spreadA)).toFixed(2)} of discriminative range vs 0.6 x ${m(spreadF).toFixed(2)} = ${(0.6*m(spreadF)).toFixed(2)}`);

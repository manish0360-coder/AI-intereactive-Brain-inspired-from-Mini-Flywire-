import { calculateDecisionScore } from '/tmp/mfw/render/scoring.js';
const rnd=(a,b)=>a+Math.random()*(b-a);
// context ranges matched to Phase 0 observed magnitudes (definitive run must use real Phase 1.0 telemetry)
function ctx(ggMax){return {transitionBoost:rnd(0,6),qValue:rnd(0,6),reward:rnd(0,8),habitBoost:rnd(0,7),
 curiosityBoost:rnd(0,0.1),chainReward:0,meaningBoost:rnd(0,0.02),futureBonus:0,boredomPenalty:rnd(0,3),
 repetitionPenalty:0,localConfidence:rnd(0,2),localStress:rnd(0,2),localFatigue:rnd(0,1),localTrust:rnd(0,2),
 localFear:rnd(0,1),curiosityState:0.3,confidenceState:8,stressState:10,fatigueState:35,focusState:1,
 dangerPenalty:rnd(0,4),selfLoopPenalty:0,bayesianTrust:rnd(0.3,0.9),goalGradientBoost:rnd(0,ggMax),
 schemaBonus:0,trajectoryIntegrity:rnd(0,1),semanticVitalityScore:rnd(0,2),noiseSuppressedScore:rnd(-2,3),
 consolidationBonus:rnd(0,2),attentionAmplifiedScore:0,uncertaintyScore:0.3,dominantDrive:null,
 executiveWeights:null};}
const ai=a=>a.reduce((b,_,i)=>a[i]>a[b]?i:b,0);
function sweep(c, ggMax, N=20000){
  let flips=0, mass=0, tot=0;
  for(let t=0;t<N;t++){
    const cand=[ctx(ggMax),ctx(ggMax),ctx(ggMax),ctx(ggMax)];
    const tu=cand.map(()=>Math.random());
    const b0=cand.map(x=>calculateDecisionScore(x));
    const b1=cand.map((x,i)=>calculateDecisionScore(x) - c*tu[i]*Math.max(x.qValue,0));
    if(ai(b0)!==ai(b1)) flips++;
    cand.forEach((x,i)=>{ mass+=Math.abs(c*tu[i]*Math.max(x.qValue,0)); tot+=Math.abs(b0[i]); });
  }
  return {flipPct:100*flips/N, massPct:100*mass/tot};
}
console.log("P5-B  minimum belief->decision channel:  finalWeight' = finalWeight - c * transitionUncertainty * max(qValue,0)");
console.log("(effective competing qValue coefficient is 5.8, not 5 -- see attentionAmplifiedScore duplication)\n");
for (const [label, ggMax] of [["goalGradient 0-100 (full range)",100],["goalGradient 0-20 (gated by trajectoryConfidence)",20],["goalGradient = 0 (no episodic evidence)",0.0001]]){
  console.log(label);
  console.log("   c      argmax-flip%   term share of |score| mass");
  for (const c of [0,0.5,1,2,4,8,16]) {
    const r=sweep(c,ggMax);
    const mark = r.flipPct>=5 ? "  <- first c meeting the >=5% pre-registration criterion" : "";
    console.log(`  ${String(c).padStart(4)}   ${r.flipPct.toFixed(2).padStart(8)}%   ${r.massPct.toFixed(2).padStart(8)}%${mark}`);
  }
  console.log();
}

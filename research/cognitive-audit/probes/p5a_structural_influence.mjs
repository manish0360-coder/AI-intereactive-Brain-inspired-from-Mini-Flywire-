import { calculateDecisionScore } from '/tmp/mfw/render/scoring.js';
const base={transitionBoost:2,qValue:3,reward:5,habitBoost:2,curiosityBoost:0.05,chainReward:0,
 meaningBoost:0.01,futureBonus:0,boredomPenalty:1,repetitionPenalty:0,localConfidence:0,localStress:0,
 localFatigue:0,localTrust:0,localFear:0,curiosityState:0,confidenceState:8,stressState:6,fatigueState:20,
 focusState:1,dangerPenalty:0,selfLoopPenalty:0,bayesianTrust:0.6,goalGradientBoost:30,schemaBonus:0,
 trajectoryIntegrity:0.4,semanticVitalityScore:0.5,noiseSuppressedScore:1,consolidationBonus:0.5,
 attentionAmplifiedScore:0,uncertaintyScore:0.3,dominantDrive:null,executiveWeights:null};

console.log("=== P5-A : does transition belief influence the decision at all? ===");
for (const f of ['transitionUncertainty','sequenceError','uncertaintyState','confidence','uncertainty','volatility','evidenceMass']) {
  const d = calculateDecisionScore({...base,[f]:1.0}) - calculateDecisionScore({...base,[f]:0.0});
  console.log(`  d(finalWeight)/d(${f.padEnd(22)}) = ${d.toFixed(12)}`);
}
const du = calculateDecisionScore({...base,uncertaintyScore:1.0}) - calculateDecisionScore({...base,uncertaintyScore:0.0});
console.log(`\n  d(finalWeight)/d(uncertaintyScore     ) = ${du.toFixed(6)}   <- only uncertainty channel that IS read`);
console.log("     (acts solely as uncertaintySemanticDamp on meaningBoost + semanticVitality)");

console.log("\n=== argmax-flip rate when transition belief is swept 0 -> 1 ===");
const rnd=(a,b)=>a+Math.random()*(b-a);
function ctx(){return {...base, transitionBoost:rnd(0,6), qValue:rnd(0,6), reward:rnd(0,8),
  habitBoost:rnd(0,7), trajectoryIntegrity:rnd(0,1), goalGradientBoost:rnd(0,100),
  bayesianTrust:rnd(0.3,0.9), noiseSuppressedScore:rnd(-2,3), consolidationBonus:rnd(0,2),
  semanticVitalityScore:rnd(0,2), boredomPenalty:rnd(0,3), dangerPenalty:rnd(0,4)};}
let flips=0,N=20000;
for(let t=0;t<N;t++){
  const c=[ctx(),ctx(),ctx(),ctx()];
  const tu=c.map(()=>Math.random());
  const lo=c.map(x=>calculateDecisionScore({...x,transitionUncertainty:0}));
  const hi=c.map((x,i)=>calculateDecisionScore({...x,transitionUncertainty:tu[i]}));
  const ai=a=>a.reduce((b,_,i)=>a[i]>a[b]?i:b,0);
  if(ai(lo)!==ai(hi)) flips++;
}
console.log(`  argmax changed in ${flips}/${N} decisions = ${(100*flips/N).toFixed(4)}%`);

console.log("\n=== effective qValue coefficient (attentionAmplifiedScore duplication) ===");
const noA=calculateDecisionScore({...base,attentionAmplifiedScore:0});
const wA =calculateDecisionScore({...base,attentionAmplifiedScore: base.reward*3+base.qValue*2+base.noiseSuppressedScore});
console.log(`  applyAttentionAmplification returns rawScore unchanged when no focus is set`);
console.log(`  rawCandidateScore = reward*3 + qValue*2 + noise  (main.js:1927), entering at *0.4`);
console.log(`  => effective qValue coeff = 5 + 0.8 = 5.8 ; effective reward gains +1.2r`);
console.log(`  delta on this context = ${(wA-noA).toFixed(3)}`);

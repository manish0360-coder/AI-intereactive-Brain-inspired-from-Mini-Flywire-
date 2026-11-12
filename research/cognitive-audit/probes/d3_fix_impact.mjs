import { calculateDecisionScore as ORIG } from '/tmp/mfw/render/scoring.js';
import { calculateDecisionScoreFIXED as FIX } from '/tmp/p1/fix/scoringFixed.js';
const base={transitionBoost:0,qValue:0,reward:0,habitBoost:0,curiosityBoost:0,chainReward:0,meaningBoost:0,
 futureBonus:0,boredomPenalty:0,repetitionPenalty:0,localConfidence:0,localStress:0,localFatigue:0,
 localTrust:0,localFear:0,curiosityState:0,confidenceState:0,stressState:0,fatigueState:0,focusState:0,
 dangerPenalty:0,selfLoopPenalty:0,bayesianTrust:0.5,goalGradientBoost:0,schemaBonus:0,trajectoryIntegrity:0,
 semanticVitalityScore:0,noiseSuppressedScore:0,consolidationBonus:0,attentionAmplifiedScore:0,
 uncertaintyScore:0,dominantDrive:null,executiveWeights:null};
console.log("S1.1/S1.3 dry run — signs corrected, |coefficient| must be identical\n");
console.log("term                  orig d     fixed d    |same magnitude|");
for (const k of ['boredomPenalty','dangerPenalty','stressState','curiosityState']){
  const o=ORIG({...base,[k]:1})-ORIG({...base}), f=FIX({...base,[k]:1})-FIX({...base});
  console.log(`${k.padEnd(20)} ${o.toFixed(4).padStart(9)} ${f.toFixed(4).padStart(10)}    ${Math.abs(Math.abs(o)-Math.abs(f))<1e-9?'YES':'NO  <-- FAIL'}`);
}
const oH=ORIG({...base,reward:8,dominantDrive:'hunger'})-ORIG({...base,reward:8});
const fH=FIX({...base,reward:8,dominantDrive:'hunger'})-FIX({...base,reward:8});
console.log(`${'hunger drive'.padEnd(20)} ${oH.toFixed(4).padStart(9)} ${fH.toFixed(4).padStart(10)}    ${Math.abs(Math.abs(oH)-Math.abs(fH))<1e-9?'YES':'NO'}`);

// S1.4 scale consequence
const rnd=(a,b)=>a+Math.random()*(b-a);
function ctx(){return {...base,transitionBoost:rnd(0,6),qValue:rnd(0,6),reward:rnd(0,8),habitBoost:rnd(0,7),
 trajectoryIntegrity:rnd(0,1),goalGradientBoost:rnd(0,20),bayesianTrust:rnd(0.3,0.9),
 noiseSuppressedScore:rnd(-2,3),consolidationBonus:rnd(0,2),semanticVitalityScore:rnd(0,2),
 boredomPenalty:rnd(0,3),dangerPenalty:rnd(0,4),confidenceState:8,stressState:10,fatigueState:35,curiosityState:0.3};}
let clampO=0,clampF=0,n=0,sumO=0,sumF=0,flip=0;
const ai=a=>a.reduce((b,_,i)=>a[i]>a[b]?i:b,0);
for(let t=0;t<20000;t++){
  const c=[ctx(),ctx(),ctx(),ctx()];
  const o=c.map(ORIG), f=c.map(FIX);
  o.forEach(v=>{if(Math.abs(v)>=399.99)clampO++; sumO+=v; n++;});
  f.forEach(v=>{if(Math.abs(v)>=399.99)clampF++; sumF+=v;});
  if(ai(o)!==ai(f)) flip++;
}
console.log(`\nS1.4 scale audit over 20000 x 4-candidate decisions:`);
console.log(`  mean score   orig ${(sumO/n).toFixed(2)}   fixed ${(sumF/n).toFixed(2)}   (shift ${((sumF-sumO)/n).toFixed(2)})`);
console.log(`  +-400 clamp  orig ${(100*clampO/n).toFixed(3)}%  fixed ${(100*clampF/n).toFixed(3)}%   ${clampF<=clampO?'OK (not worse)':'FAIL'}`);
console.log(`  argmax differs between orig and fixed in ${(100*flip/20000).toFixed(2)}% of decisions`);
console.log(`  -> D3 is NOT cosmetic: it changes the chosen action in ~1 of every ${Math.round(20000/flip)} decisions`);

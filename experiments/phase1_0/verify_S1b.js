import { calculateDecisionScore as ORIG } from './baseline/scoring_prefix_D3.js';
import { calculateDecisionScore as FIX  } from '../../render/scoring.js';
const base={transitionBoost:0,qValue:0,reward:0,habitBoost:0,curiosityBoost:0,chainReward:0,meaningBoost:0,
 futureBonus:0,boredomPenalty:0,repetitionPenalty:0,localConfidence:0,localStress:0,localFatigue:0,localTrust:0,
 localFear:0,curiosityState:0,confidenceState:0,stressState:0,fatigueState:0,focusState:0,dangerPenalty:0,
 selfLoopPenalty:0,bayesianTrust:0.5,goalGradientBoost:0,schemaBonus:0,trajectoryIntegrity:0,
 semanticVitalityScore:0,noiseSuppressedScore:0,consolidationBonus:0,attentionAmplifiedScore:0,
 uncertaintyScore:0,dominantDrive:null,executiveWeights:null};

console.log('── S1.5b  DISCRIMINATING case: pre-fix agent prefers the punished path ──');
// two candidates, similar merit; B has been punished repeatedly (penalties near the cap)
const A={...base,transitionBoost:2.9,qValue:2.0,reward:4.0,habitBoost:2.2,confidenceState:8,stressState:10,
         fatigueState:35,curiosityState:0.3,dangerPenalty:0,boredomPenalty:0.2};
const B={...base,transitionBoost:2.5,qValue:1.6,reward:3.4,habitBoost:1.8,confidenceState:8,stressState:10,
         fatigueState:35,curiosityState:0.3,dangerPenalty:8*1.5,boredomPenalty:3.0};   // penalty=8 (main.js cap), boredom high
const oA=ORIG(A),oB=ORIG(B),fA=FIX(A),fB=FIX(B);
console.log(`      candidate A (clean)    pre ${oA.toFixed(2)}   post ${fA.toFixed(2)}`);
console.log(`      candidate B (punished) pre ${oB.toFixed(2)}   post ${fB.toFixed(2)}   [penalties=8 -> dangerPenalty=12]`);
console.log(`      pre-fix  picks: ${oA>oB?'A (clean)':'B (PUNISHED)'}`);
console.log(`      post-fix picks: ${fA>fB?'A (clean)':'B (PUNISHED)'}`);
const good = (oB>oA) && (fA>fB);
console.log(`${good?'PASS':'FAIL'}  S1.5b  D3 reverses a wrong preference on a punished path`);

console.log('\n── S1.6  REGRESSION: P5-A still holds (no belief channel opened) ──');
let z=true;
for(const f of ['transitionUncertainty','sequenceError','uncertaintyState','confidence','uncertainty','volatility','evidenceMass']){
  const dd=FIX({...base,[f]:1})-FIX({...base,[f]:0});
  if(dd!==0){z=false;console.log(`      ${f} = ${dd}`);}
}
console.log(`${z?'PASS':'FAIL'}  S1.6  D3 did NOT open a belief->decision channel (all d = 0, as required)`);

console.log('\n── S1.7  lastArbitrationBreakdown preserved bit-for-bit ──');
import * as O from './baseline/scoring_prefix_D3.js';
import * as F from '../../render/scoring.js';
const R=(a,b)=>a+Math.random()*(b-a);
let bd=true,cnt=0;
for(let i=0;i<20000;i++){
  const c={...base,transitionBoost:R(0,6),qValue:R(0,6),reward:R(0,8),habitBoost:R(0,7),curiosityBoost:R(0,3),
    goalGradientBoost:R(0,50),schemaBonus:R(0,1),bayesianTrust:R(0,1),boredomPenalty:R(0,3),stressState:R(0,20),
    fatigueState:R(0,60),curiosityState:R(0,3),confidenceState:R(0,20),dominantDrive:[null,'hunger','boredom','stress'][i%4],
    semanticVitalityScore:R(0,2),futureBonus:R(0,20),meaningBoost:R(0,0.1),consolidationBonus:R(0,2),
    repetitionPenalty:i%3===0?R(0,4):0,uncertaintyScore:R(0,1)};
  ORIG(c); const a=JSON.stringify(O.lastArbitrationBreakdown);
  FIX(c);  const b=JSON.stringify(F.lastArbitrationBreakdown);
  cnt++; if(a!==b){bd=false; if(cnt<3)console.log('      DIFF',a,'\n           ',b);}
}
console.log(`${bd?'PASS':'FAIL'}  S1.7  arbitration breakdown identical across ${cnt} contexts (arbitrate() path unaffected)`);

console.log('\n── S1.8  exports unchanged (S5.1 no-new-export rule) ──');
const oKeys=Object.keys(O).sort().join(','), fKeys=Object.keys(F).sort().join(',');
console.log(`      original: ${oKeys}`);
console.log(`      fixed   : ${fKeys}`);
console.log(`${oKeys===fKeys?'PASS':'FAIL'}  S1.8  export surface identical`);

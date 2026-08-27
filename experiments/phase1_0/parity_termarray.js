// PARITY PROOF: the term-array replica must be bit-identical to the original,
// before any sign is touched. Math.random is stubbed deterministically so both
// functions see the same drift draw.
import { calculateDecisionScore as ORIG } from './baseline/scoring_prefix_D3.js';
import { calculateDecisionScore as REP } from './baseline/scoring_termarray_preflip.js';

let seq = 0, stream = [];
const realRandom = Math.random;
function resetStub(n){ seq = 0; stream = Array.from({length:n},(_,i)=>((i*2654435761)>>>0)/4294967296); }
Math.random = () => stream[seq++ % stream.length];

const F = ['transitionBoost','qValue','reward','habitBoost','curiosityBoost','chainReward','meaningBoost',
'futureBonus','boredomPenalty','repetitionPenalty','localConfidence','localStress','localFatigue','localTrust',
'localFear','curiosityState','confidenceState','stressState','fatigueState','focusState','dangerPenalty',
'selfLoopPenalty','bayesianTrust','goalGradientBoost','schemaBonus','trajectoryIntegrity','semanticVitalityScore',
'noiseSuppressedScore','consolidationBonus','attentionAmplifiedScore','uncertaintyScore'];
const R=(a,b)=>a+realRandom()*(b-a);
function randCtx(){
  const c={};
  for(const f of F) c[f]=R(-5,25);
  c.bayesianTrust=R(0,1); c.uncertaintyScore=R(0,1); c.trajectoryIntegrity=R(0,1);
  c.repetitionPenalty=realRandom()<0.5?0:R(0,6); c.fatigueState=R(0,200);
  c.dominantDrive=[null,'hunger','boredom','stress','fatigue'][Math.floor(realRandom()*5)];
  c.executiveWeights=realRandom()<0.5?null:{exploit:R(0,2),explore:R(0,2)};
  // spread the extra params main.js passes, incl. the Beta posterior fields
  c.uncertaintyState=R(0,1); c.transitionUncertainty=R(0,1); c.sequenceError=R(0,1);
  c.confidence=R(0,1); c.uncertainty=R(0,1); c.volatility=R(0,1); c.evidenceMass=R(1,40);
  return c;
}
let n=0, mismatch=0, worst=0;
const N=200000;
for(let i=0;i<N;i++){
  const c=randCtx();
  resetStub(4); const a=ORIG(c);
  resetStub(4); const b=REP(c);
  n++;
  if(!Object.is(a,b)){ mismatch++; worst=Math.max(worst,Math.abs(a-b)); if(mismatch<=3) console.log('  MISMATCH',a,b,JSON.stringify(c).slice(0,120)); }
}
Math.random = realRandom;
console.log(`PARITY: ${n-mismatch}/${n} bit-identical  (mismatches: ${mismatch}, worst |delta|: ${worst})`);
console.log(mismatch===0 ? "PASS — term-array refactor is arithmetic-identical to the original"
                         : "FAIL — refactor changed the arithmetic; do NOT proceed");
process.exit(mismatch===0?0:1);

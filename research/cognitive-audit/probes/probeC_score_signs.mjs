import { calculateDecisionScore } from '/tmp/mfw/render/scoring.js';

const base = {
  transitionBoost:0, qValue:0, reward:0, habitBoost:0, curiosityBoost:0, chainReward:0,
  meaningBoost:0, futureBonus:0, boredomPenalty:0, repetitionPenalty:0,
  localConfidence:0, localStress:0, localFatigue:0, localTrust:0, localFear:0,
  curiosityState:0, confidenceState:0, stressState:0, fatigueState:0, focusState:0,
  dangerPenalty:0, selfLoopPenalty:0, bayesianTrust:0.5, goalGradientBoost:0,
  schemaBonus:0, trajectoryIntegrity:0, semanticVitalityScore:0,
  noiseSuppressedScore:0, consolidationBonus:0, attentionAmplifiedScore:0,
  uncertaintyScore:0, dominantDrive:null, executiveWeights:null,
};
// neutralise stochastic drift by zero curiosityState (drift = (rand-.5)*curiosityState*0.06 = 0)
const b0 = calculateDecisionScore({...base});
const keys = ['transitionBoost','qValue','reward','habitBoost','curiosityBoost','chainReward',
  'meaningBoost','futureBonus','boredomPenalty','repetitionPenalty','localConfidence','localStress',
  'localFatigue','localTrust','localFear','confidenceState','stressState','fatigueState',
  'dangerPenalty','selfLoopPenalty','goalGradientBoost','schemaBonus','trajectoryIntegrity',
  'semanticVitalityScore','noiseSuppressedScore','consolidationBonus','attentionAmplifiedScore','bayesianTrust'];
console.log('baseline finalWeight =', b0.toFixed(4));
console.log('\nname                        d(score)/d(input)  sign  INTENT  VERDICT');
const intent = {boredomPenalty:'-',repetitionPenalty:'-',localStress:'-',localFatigue:'-',
  localFear:'-',stressState:'-',fatigueState:'-',dangerPenalty:'-',selfLoopPenalty:'-'};
for (const k of keys) {
  const v = (k==='bayesianTrust')?1.0:1.0;
  const s = calculateDecisionScore({...base, [k]: v});
  const d = (s - b0) / ((k==='bayesianTrust')?0.5:1.0);
  const sign = d>1e-9?'+':(d<-1e-9?'-':'0');
  const want = intent[k] || '+';
  const verdict = (sign==='0')?'NO EFFECT':(sign===want?'ok':'*** INVERTED ***');
  console.log(k.padEnd(28), d.toFixed(4).padStart(10), '   ', sign, '     ', want, '   ', verdict);
}

import { calculateDecisionScore } from '/tmp/mfw/render/scoring.js';
const base = {transitionBoost:0,qValue:0,reward:0,habitBoost:0,curiosityBoost:0,chainReward:0,
 meaningBoost:0,futureBonus:0,boredomPenalty:0,repetitionPenalty:0,localConfidence:0,localStress:0,
 localFatigue:0,localTrust:0,localFear:0,curiosityState:0,confidenceState:0,stressState:0,
 fatigueState:0,focusState:0,dangerPenalty:0,selfLoopPenalty:0,bayesianTrust:0.5,goalGradientBoost:0,
 schemaBonus:0,trajectoryIntegrity:0,semanticVitalityScore:0,noiseSuppressedScore:0,
 consolidationBonus:0,attentionAmplifiedScore:0,uncertaintyScore:0,dominantDrive:null,executiveWeights:null};

// curiosityState (average over drift)
let a=0,b=0; for(let i=0;i<20000;i++){a+=calculateDecisionScore({...base}); b+=calculateDecisionScore({...base,curiosityState:1});}
console.log('E[d(score)/d(curiosityState)] =', ((b-a)/20000).toFixed(4), ' (intended: + for exploration)');

// dominantDrive = hunger (driveRewardBoost)
const noDrive = calculateDecisionScore({...base, reward:8});
const hunger  = calculateDecisionScore({...base, reward:8, dominantDrive:'hunger'});
console.log('hunger drive effect on a reward=8 candidate:', (hunger-noDrive).toFixed(4), '(intended: amplify reward-seeking, i.e. +)');
const bored   = calculateDecisionScore({...base, curiosityBoost:0.08, dominantDrive:'boredom'});
const noB     = calculateDecisionScore({...base, curiosityBoost:0.08});
console.log('boredom drive effect:', (bored-noB).toFixed(4));

// realistic magnitude comparison: what dominates a decision?
const real = {...base, transitionBoost: Math.log1p(20)*1.8, qValue: 3, reward: 6, habitBoost: Math.log(9)*3,
  curiosityBoost: 0.02, meaningBoost: 0.1, futureBonus: 0, goalGradientBoost: 0, schemaBonus: 0,
  trajectoryIntegrity: 0.6, bayesianTrust: 0.7, semanticVitalityScore: 0.5, noiseSuppressedScore: 1,
  consolidationBonus: 0.5, attentionAmplifiedScore: 20, confidenceState: 10, stressState: 12,
  fatigueState: 40, boredomPenalty: 2.4, dangerPenalty: 3, curiosityState: 0.3};
console.log('\nrealistic candidate score =', calculateDecisionScore(real).toFixed(2));
const terms = {
  'transitionBoost*3':real.transitionBoost*3,'qValue*5':real.qValue*5,'tanh(reward*.1)*8':Math.tanh(real.reward*0.1)*8,
  'habitBoost*2':real.habitBoost*2,'trajectoryIntegrity*40':real.trajectoryIntegrity*40,
  'schemaBonus*15':real.schemaBonus*15,'goalGradient*2':real.goalGradientBoost*2,
  'attnAmplified*0.4':real.attentionAmplifiedScore*0.4,'trustBonus*1.5':Math.max(0,real.bayesianTrust-0.5)*8*1.5,
  'boredomPenalty*2 (WRONG SIGN)':real.boredomPenalty*2,'dangerPenalty*2 (WRONG SIGN)':real.dangerPenalty*2,
  'stressState*0.4 (WRONG SIGN)':real.stressState*0.4,
};
console.log('term contributions:'); Object.entries(terms).sort((x,y)=>Math.abs(y[1])-Math.abs(x[1])).forEach(([k,v])=>console.log('  ',k.padEnd(32), v.toFixed(2)));

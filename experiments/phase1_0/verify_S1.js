// ==========================================================
// PHASE 1.0 — MILESTONE 1 (D3) VERIFICATION GATE  : S1.1 – S1.5
// ==========================================================
import { calculateDecisionScore as ORIG } from './baseline/scoring_prefix_D3.js';
import { calculateDecisionScore as FIX  } from '../../render/scoring.js';

let pass=0, fail=0;
const ok=(n,c,extra='')=>{ c?pass++:fail++; console.log(`${c?'PASS':'FAIL'}  ${n}${extra?'   '+extra:''}`); };
const NEAR=(a,b,e=1e-9)=>Math.abs(a-b)<e;

const base={transitionBoost:0,qValue:0,reward:0,habitBoost:0,curiosityBoost:0,chainReward:0,meaningBoost:0,
 futureBonus:0,boredomPenalty:0,repetitionPenalty:0,localConfidence:0,localStress:0,localFatigue:0,localTrust:0,
 localFear:0,curiosityState:0,confidenceState:0,stressState:0,fatigueState:0,focusState:0,dangerPenalty:0,
 selfLoopPenalty:0,bayesianTrust:0.5,goalGradientBoost:0,schemaBonus:0,trajectoryIntegrity:0,
 semanticVitalityScore:0,noiseSuppressedScore:0,consolidationBonus:0,attentionAmplifiedScore:0,
 uncertaintyScore:0,dominantDrive:null,executiveWeights:null};
const d=(f,k,v=1)=>(f({...base,[k]:v})-f({...base}))/v;
// average over drift for stochastic terms
const dAvg=(f,k,v=1,N=200000)=>{let s=0;for(let i=0;i<N;i++)s+=f({...base,[k]:v})-f({...base});return s/N/v;};

console.log('── S1.1  sign semantics ─────────────────────────────────────');
const NEG=['boredomPenalty','dangerPenalty','stressState','fatigueState','localStress','localFatigue',
           'localFear','selfLoopPenalty','repetitionPenalty'];
const POS=['transitionBoost','qValue','reward','habitBoost','curiosityBoost','chainReward','meaningBoost',
           'futureBonus','localConfidence','localTrust','confidenceState','goalGradientBoost','schemaBonus',
           'trajectoryIntegrity','semanticVitalityScore','noiseSuppressedScore','consolidationBonus',
           'attentionAmplifiedScore','bayesianTrust','curiosityState'];
let s1ok=true;
for(const k of NEG){ const v=(k==='curiosityState')?dAvg(FIX,k):d(FIX,k); if(!(v<0)){s1ok=false;console.log(`      ${k} = ${v.toFixed(4)} (expected < 0)`);} }
for(const k of POS){ const v=(k==='curiosityState')?dAvg(FIX,k):d(FIX,k); if(!(v>0)){s1ok=false;console.log(`      ${k} = ${v.toFixed(4)} (expected > 0)`);} }
ok('S1.1  every penalty/cost has d<0 and every boost/bonus has d>0', s1ok);

console.log('\n── S1.2  motivational drives amplify their target ───────────');
const hungerO=ORIG({...base,reward:8,dominantDrive:'hunger'})-ORIG({...base,reward:8});
const hungerF=FIX ({...base,reward:8,dominantDrive:'hunger'})-FIX ({...base,reward:8});
ok('S1.2a hunger now INCREASES a reward-8 candidate', hungerF>0, `was ${hungerO.toFixed(4)} -> now ${hungerF.toFixed(4)}`);
const borO=ORIG({...base,curiosityBoost:0.08,dominantDrive:'boredom'})-ORIG({...base,curiosityBoost:0.08});
const borF=FIX ({...base,curiosityBoost:0.08,dominantDrive:'boredom'})-FIX ({...base,curiosityBoost:0.08});
ok('S1.2b boredom increases a curiosity candidate (unchanged)', borF>0 && NEAR(borO,borF), `${borO.toFixed(4)} -> ${borF.toFixed(4)}`);

console.log('\n── S1.3  ANTI-RETUNING: no coefficient changed ──────────────');
const FLIPPED=new Set(['boredomPenalty','dangerPenalty','stressState','curiosityState']);
const ALL=[...new Set([...NEG,...POS])];
let untouched=true, rows=[];
for(const k of ALL){
  if(FLIPPED.has(k)) continue;
  const o=d(ORIG,k), f=d(FIX,k);
  if(!NEAR(o,f)){untouched=false; rows.push(`      ${k}: ${o} -> ${f}`);}
}
ok('S1.3a  every NON-flipped term derivative bit-unchanged', untouched, `${ALL.length-FLIPPED.size} terms checked`);
if(!untouched) rows.forEach(r=>console.log(r));

// flipped single-path terms: |d| must be preserved
let magOK=true, magRows=[];
for(const k of ['boredomPenalty','dangerPenalty']){
  const o=d(ORIG,k), f=d(FIX,k);
  const good=NEAR(Math.abs(o),Math.abs(f)) && Math.sign(o)===-Math.sign(f);
  if(!good) magOK=false;
  magRows.push(`      ${k}: ${o.toFixed(4)} -> ${f.toFixed(4)}  |coef| preserved: ${NEAR(Math.abs(o),Math.abs(f))}`);
}
ok('S1.3b  single-path flipped terms: |coefficient| preserved, sign inverted', magOK);
magRows.forEach(r=>console.log(r));

// multi-path terms: assert the analytically predicted direct+indirect sum
const stressF=d(FIX,'stressState');
ok('S1.3c  stressState = -0.400 direct + 0.175 via dynamicFocus = -0.225',
   NEAR(stressF,-0.225,1e-9), `measured ${stressF.toFixed(6)}`);
const fatigueO=d(ORIG,'fatigueState'), fatigueF=d(FIX,'fatigueState');
ok('S1.3d  fatigueState unchanged at -0.125 (-0.35 direct +0.225 via dynamicFocus)',
   NEAR(fatigueO,fatigueF)&&NEAR(fatigueF,-0.125,1e-9), `measured ${fatigueF.toFixed(6)}`);
const curO=dAvg(ORIG,'curiosityState'), curF=dAvg(FIX,'curiosityState');
ok('S1.3e  curiosityState |coef| preserved (mean over 200k drift draws)',
   NEAR(Math.abs(curO),Math.abs(curF),2e-3)&&curF>0, `${curO.toFixed(4)} -> ${curF.toFixed(4)}`);
ok('S1.3f  driveRewardBoost |coef| preserved, sign inverted',
   NEAR(Math.abs(hungerO),Math.abs(hungerF),1e-9)&&hungerF>0, `${hungerO.toFixed(4)} -> ${hungerF.toFixed(4)}`);

console.log('\n── S1.4  scale-consequence audit ────────────────────────────');
const R=(a,b)=>a+Math.random()*(b-a);
const ctx=()=>({...base,transitionBoost:R(0,6),qValue:R(0,6),reward:R(0,8),habitBoost:R(0,7),
 trajectoryIntegrity:R(0,1),goalGradientBoost:R(0,20),bayesianTrust:R(0.3,0.9),noiseSuppressedScore:R(-2,3),
 consolidationBonus:R(0,2),semanticVitalityScore:R(0,2),boredomPenalty:R(0,3),dangerPenalty:R(0,4),
 confidenceState:8,stressState:10,fatigueState:35,curiosityState:0.3,attentionAmplifiedScore:R(0,30)});
let clampO=0,clampF=0,n=0,sumO=0,sumF=0,flip=0,len1O=0,len1F=0;
const ai=a=>a.reduce((b,_,i)=>a[i]>a[b]?i:b,0);
const N=20000;
for(let t=0;t<N;t++){
  const c=[ctx(),ctx(),ctx(),ctx()];
  const o=c.map(ORIG), f=c.map(FIX);
  o.forEach(v=>{if(Math.abs(v)>=399.999)clampO++;sumO+=v;n++;});
  f.forEach(v=>{if(Math.abs(v)>=399.999)clampF++;sumF+=v;});
  if(ai(o)!==ai(f))flip++;
  const sm=a=>{const m=Math.max(...a);const e=a.map(x=>Math.exp(x-m));const s=e.reduce((p,q)=>p+q,0);return Math.max(...e)/s;};
  if(sm(o)>0.7)len1O++; if(sm(f)>0.7)len1F++;
}
console.log(`      mean score        orig ${(sumO/n).toFixed(2)}   fixed ${(sumF/n).toFixed(2)}   (shift ${((sumF-sumO)/n).toFixed(2)})`);
console.log(`      +-400 clamp rate  orig ${(100*clampO/n).toFixed(4)}%  fixed ${(100*clampF/n).toFixed(4)}%`);
console.log(`      softmax topProb>0.7 (=> topChoices length 1)  orig ${(100*len1O/N).toFixed(2)}%  fixed ${(100*len1F/N).toFixed(2)}%`);
console.log(`      argmax differs orig vs fixed: ${(100*flip/N).toFixed(2)}% of decisions`);
ok('S1.4a  clamp rate not worse than pre-fix', clampF<=clampO);
ok('S1.4b  softmax degeneracy unchanged (F5 not made worse)', Math.abs(len1F-len1O)/N < 0.05);

console.log('\n── S1.5  behavioural: taught path beats a punished alternative ──');
const taught  ={...base,transitionBoost:Math.log1p(20)*1.8,qValue:3,reward:6,habitBoost:Math.log(9)*3,
                trajectoryIntegrity:0.6,bayesianTrust:0.7,dangerPenalty:0,boredomPenalty:0.5,
                confidenceState:8,stressState:10,fatigueState:35,curiosityState:0.3};
const punished={...taught,reward:1,qValue:0.5,transitionBoost:0.5,habitBoost:0.5,trajectoryIntegrity:0,
                dangerPenalty:4.5,boredomPenalty:2.5};
const oT=ORIG(taught),oP=ORIG(punished),fT=FIX(taught),fP=FIX(punished);
console.log(`      pre-fix : taught ${oT.toFixed(2)}  punished ${oP.toFixed(2)}  -> picks ${oT>oP?'TAUGHT':'PUNISHED'}`);
console.log(`      post-fix: taught ${fT.toFixed(2)}  punished ${fP.toFixed(2)}  -> picks ${fT>fP?'TAUGHT':'PUNISHED'}`);
ok('S1.5  repaired agent prefers the taught path over the punished one', fT>fP);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);

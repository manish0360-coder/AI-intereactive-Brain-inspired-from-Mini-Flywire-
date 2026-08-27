// ==========================================================
// PHASE 1.0 — MILESTONE 2 (D1 + Q4) VERIFICATION GATE : S2.1 – S2.8
// ==========================================================
import { Q, getQ, getQAny, setQ, updateQ, dampQ, makeStateKey, GOAL_NONE } from '../../render/qlearning.js';
import { initEpisodeManager, recordManualClick, recordAutonomousStep,
         getAllEpisodes, clearAllEpisodes } from '../../render/episodeManager.js';
import { createEmbedding, trainEmbedding, similarity, setEmbeddingNeuronMap } from '../../render/embeddings.js';
import { setNeuronMap, findNeuronById } from '../../render/search.js';
import fs from 'node:fs';

let pass=0, fail=0;
const ok=(n,c,x='')=>{c?pass++:fail++;console.log(`${c?'PASS':'FAIL'}  ${n}${x?'   '+x:''}`);};
const GOAL = 16;

console.log('── S2.1  Phase 0 Probe A inverted: RL writes are now readable ──');
Q.clear();
let written=0;
for(let i=0;i<500;i++){
  const a=1+Math.floor(Math.random()*20), b=1+Math.floor(Math.random()*20);
  updateQ({state:makeStateKey(a,GOAL),action:b,reward:Math.random()*12,
           nextState:makeStateKey(b,GOAL),alpha:0.1,gamma:0.9});
}
written=Q.size;
// the EXACT read form now used by the scoring path (main.js:1695)
let readable=0;
for(const key of Q.keys()){
  const [state,action]=key.split('->');
  const pos=state.split('#')[0];
  if(getQ(makeStateKey(pos,GOAL),action)!==0) readable++;
}
ok('S2.1  500 autonomous updates -> every entry visible to the scorer',
   readable===written && written>0, `${readable}/${written} readable (Phase 0 baseline: 0/275)`);

console.log('\n── S2.2  round-trip through the real call forms ──');
Q.clear();
updateQ({state:makeStateKey(5,GOAL),action:6,reward:12,nextState:makeStateKey(6,GOAL),alpha:0.5,gamma:0.9});
const rt=getQ(makeStateKey(5,GOAL),6);
ok('S2.2  write(makeStateKey) -> read(makeStateKey) is non-zero', rt!==0, `Q = ${rt.toFixed(4)}`);

console.log('\n── S2.3  single-goal isomorphism (composite <-> bare) ──');
// identical operation sequence in both namespaces must yield identical VALUES
const ops=Array.from({length:300},()=>({a:1+Math.floor(Math.random()*20),b:1+Math.floor(Math.random()*20),r:Math.random()*12}));
Q.clear(); for(const o of ops) updateQ({state:makeStateKey(o.a,GOAL),action:o.b,reward:o.r,nextState:makeStateKey(o.b,GOAL),alpha:0.1,gamma:0.9});
const comp=new Map([...Q.entries()].map(([k,v])=>[k.replace(`#${GOAL}`,''),v]));
Q.clear(); for(const o of ops) updateQ({state:o.a,action:o.b,reward:o.r,nextState:o.b,alpha:0.1,gamma:0.9});
const bare=new Map(Q.entries());
let iso = comp.size===bare.size;
if(iso) for(const [k,v] of bare) if(!Object.is(comp.get(k),v)) { iso=false; break; }
ok('S2.3  with one fixed goal the namespaces are isomorphic (pure re-keying)',
   iso, `${comp.size} keys compared`);

console.log('\n── S2.4  episodeManager PARITY (the regression guard) ──');
// headless neuronMap + injected systems: drive the real teaching pipeline
const nodes=JSON.parse(fs.readFileSync('../../neurons.json','utf8'));
const conns=JSON.parse(fs.readFileSync('../../connections.json','utf8'));
const neuronMap=new Map();
nodes.forEach(n=>neuronMap.set(n.id,{id:n.id,userData:{id:n.id,label:n.label,neighbors:[],embedding:createEmbedding()}}));
conns.forEach(c=>{const A=neuronMap.get(c.from),B=neuronMap.get(c.to);
  if(A&&B){if(!A.userData.neighbors.includes(c.to))A.userData.neighbors.push(c.to);
           if(!B.userData.neighbors.includes(c.from))B.userData.neighbors.push(c.from);}});
setNeuronMap(neuronMap); setEmbeddingNeuronMap(neuronMap);
const transitions=new Map(), rewards=new Map(), confidenceMap=new Map();
const PROV={MANUAL_TRAINING:0.6,DIRECT_EXPERIENCE:1.0,REPLAY:0.4};
initEpisodeManager({
  transitions, rewards, confidenceMap, updateQ, makeStateKey,        // <- D1 injection
  PROVENANCE:PROV,
  writeReward:(m,k,v,prov,cap)=>m.set(k,Math.min((m.get(k)||0)+v*prov,cap)),
  logActivation:()=>{}, trainEmbedding,
  reinforceEpisodeSemantics:()=>{}, reinforceSemanticStrength:()=>{},
  recordSuccess:()=>{}, reinforcePath:()=>{}, findNeuronById,
  learnMomentum:()=>{}, rebuildSchemas:()=>{},
});
Q.clear(); clearAllEpisodes();
// teach 1 -> 2 -> 5 -> 8 -> 16 the way the click handler does, WITH the goal
const taught=[1,2,5,8,16];
taught.forEach((id,i)=>recordManualClick(id, neuronMap.get(id).userData.label, id===GOAL, GOAL));
const eps=getAllEpisodes();
const wroteKeys=[...Q.keys()];
let taughtReadable=0, taughtPairs=0;
for(let i=0;i<taught.length-1;i++){
  taughtPairs++;
  if(getQ(makeStateKey(taught[i],GOAL),taught[i+1])!==0) taughtReadable++;
}
console.log(`      episodes sealed: ${eps.length}   activeGoal: ${eps.map(e=>e.activeGoal).join(',')}`);
console.log(`      Q keys written : ${wroteKeys.slice(0,5).join(' , ')}${wroteKeys.length>5?' …':''}`);
ok('S2.4a taught episode carries the live goal (not null)', eps.length>0 && eps.every(e=>e.activeGoal===GOAL));
ok('S2.4b every taught transition is readable by the scoring path',
   taughtPairs>0 && taughtReadable===taughtPairs, `${taughtReadable}/${taughtPairs}`);
ok('S2.4c no bare-namespace Q key was written', wroteKeys.every(k=>k.includes('#')), wroteKeys.filter(k=>!k.includes('#')).join(','));

console.log('\n── S2.4d explore-step parity ──');
Q.clear();
recordAutonomousStep(1,2,neuronMap,GOAL);
const expKeys=[...Q.keys()];
ok('S2.4d explore step writes composite keys under the live goal',
   expKeys.length>0 && expKeys.every(k=>k.startsWith(`1#${GOAL}->`)), expKeys.join(','));

console.log('\n── S2.5  D8/F12 documentation (DEFERRED — measure only) ──');
Q.clear();
updateQ({state:makeStateKey(5,GOAL),action:6,reward:12,nextState:makeStateKey(6,GOAL),alpha:1.0,gamma:0});
const qk=[...Q.keys()][0];
const rewardsProbe=new Map([['5->6',7]]);          // reward map is keyed BARE
const lookedUp=rewardsProbe.get(qk);               // main.js:3062 does exactly this
console.log(`      Q key "${qk}"  looked up in rewards map -> ${lookedUp===undefined?'undefined (MISS)':lookedUp}`);
console.log(`      => decay rate branch chosen: ${(lookedUp||0)>5?'0.9998 (protected)':'0.999 (unprotected)'}`);
console.log(`      D8/F12 CONFIRMED STILL PRESENT and NOT FIXED, per ruling. The "gentler decay for`);
console.log(`      manually-trained paths" branch remains unreachable; all Q decays at 0.999.`);
ok('S2.5  D8 measured and documented, not fixed', lookedUp===undefined);

console.log('\n── S2.6  Q4: getQAny restores the embedding learning rate ──');
Q.clear();
updateQ({state:makeStateKey(1,GOAL),action:2,reward:12,nextState:makeStateKey(2,GOAL),alpha:1.0,gamma:0});
const bareRead=getQ(1,2), anyRead=getQAny(1,2);
ok('S2.6a bare getQ(1,2) is 0 after D1 (this is why Q4 was needed)', bareRead===0, `${bareRead}`);
ok('S2.6b getQAny(1,2) recovers the value across goal contexts', anyRead>0, `${anyRead.toFixed(4)}`);
// legacy bare key tolerance (restored localStorage brain)
Q.clear(); setQ(3,4,7.5);
ok('S2.6c getQAny tolerates legacy bare keys', getQAny(3,4)===7.5, `${getQAny(3,4)}`);
// no false positives across similar ids
Q.clear(); setQ(makeStateKey(5,GOAL),16,9); setQ(makeStateKey(15,GOAL),6,4);
ok('S2.6d getQAny does not confuse action 6 with 16, or pos 5 with 15',
   getQAny(5,6)===0 && getQAny(5,16)===9 && getQAny(15,6)===4,
   `getQAny(5,6)=${getQAny(5,6)} getQAny(5,16)=${getQAny(5,16)} getQAny(15,6)=${getQAny(15,6)}`);
// max across goals
Q.clear(); setQ(makeStateKey(5,16),6,3); setQ(makeStateKey(5,9),6,11); setQ(makeStateKey(5,GOAL_NONE),6,1);
ok('S2.6e getQAny returns the max across goal contexts', getQAny(5,6)===11, `${getQAny(5,6)}`);

console.log('\n── S2.7  dampQ now targets the same namespace it should ──');
Q.clear();
setQ(makeStateKey(5,GOAL),6,10);   // RL-learned value
setQ(5,6,10);                       // legacy bare value
dampQ(makeStateKey(5,GOAL),6,0.10);
const compAfter=Q.get(`5#${GOAL}->6`), bareAfter=Q.get('5->6');
console.log(`      composite "5#${GOAL}->6" 10 -> ${compAfter}`);
console.log(`      legacy    "5->6"        10 -> ${bareAfter}`);
ok('S2.7  dampQ erodes the RL-learned value, not an unrelated namespace',
   compAfter<10 && bareAfter===10);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);

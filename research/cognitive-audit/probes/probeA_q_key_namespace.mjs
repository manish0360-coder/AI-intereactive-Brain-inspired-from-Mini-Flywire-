import { Q, getQ, updateQ, dampQ, makeStateKey, GOAL_NONE } from '/tmp/mfw/render/qlearning.js';

// === Replicate main.js call pattern exactly ===
// WRITE (main.js:3814 / 3987): composite state key
const agentLast = 5, next = 6, agentCurrent = 6, goalNeuronId = 16;
updateQ({state: makeStateKey(agentLast, goalNeuronId), action: next, reward: 12,
         nextState: makeStateKey(agentCurrent, goalNeuronId), alpha: 0.1, gamma: 0.9});
console.log('Q table after one autonomous learning update:', [...Q.entries()]);

// READ (main.js:1500/1689, inside runPrediction candidate scoring)
const currentKey = 5, k = 6;
console.log('getQ(currentKey,k) used by decision scoring ->', getQ(currentKey, k));
console.log('READ KEY  :', `"${currentKey}->${k}"`);
console.log('WRITE KEY :', `"${makeStateKey(agentLast,goalNeuronId)}->${next}"`);
console.log('MATCH?    :', getQ(currentKey,k) !== 0);

// 500 autonomous steps, then check whether ANY scoring read is non-zero
Q.clear();
for (let i=0;i<500;i++){
  const a = 1+Math.floor(Math.random()*20), b = 1+Math.floor(Math.random()*20);
  updateQ({state: makeStateKey(a,16), action:b, reward: Math.random()*12,
           nextState: makeStateKey(b,16), alpha:0.1, gamma:0.9});
}
let readable=0, total=0;
for (const key of Q.keys()){ total++; const [s,a]=key.split('->'); if (getQ(s.split('#')[0], a)!==0) readable++; }
console.log(`\nAfter 500 autonomous Q updates: ${total} Q entries written, ${readable} visible to calculateDecisionScore's getQ(pos,action).`);

// what episodeManager writes (bare keys) — visible?
Q.clear();
updateQ({state: 5, action: 6, reward: 5, nextState: 6, alpha: 0.3, gamma: 0.9});
console.log('episodeManager-style write ->', [...Q.entries()], '| scoring read getQ(5,6) =', getQ(5,6));

// dampQ target
Q.clear();
updateQ({state: 5, action: 6, reward: 5, nextState: 6, alpha: 0.45, gamma: 0.9}); // teaching value
updateQ({state: makeStateKey(5,16), action: 6, reward: 5, nextState: makeStateKey(6,16), alpha:0.1, gamma:0.9}); // RL value
const before = {...Object.fromEntries(Q)};
dampQ(5, 6, 0.05);   // main.js:3858 dampQ(agentLast,next,...) -> bare key
console.log('\ndampQ(agentLast,next) targets bare key. before/after:');
console.log('  "5->6"   ', before['5->6'], '->', Q.get('5->6'));
console.log('  "5#16->6"', before['5#16->6'], '->', Q.get('5#16->6'));

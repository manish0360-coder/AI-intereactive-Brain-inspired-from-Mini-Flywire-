import { setNeuronMap, findNeuronById } from '/tmp/mfw/render/search.js';
import { createEmbedding, trainEmbedding, setEmbeddingNeuronMap } from '/tmp/mfw/render/embeddings.js';
import { futureScore, lookAheadScore } from '/tmp/mfw/render/planning.js';
import fs from 'fs';

const neurons = JSON.parse(fs.readFileSync('/tmp/mfw/neurons.json','utf8'));
const conns   = JSON.parse(fs.readFileSync('/tmp/mfw/connections.json','utf8'));
const map = new Map();
let threeIdCounter = 1000;   // THREE.Object3D auto-increment id (scene/camera/group/meshes created first)
neurons.forEach(n=>{
  const obj = { id: threeIdCounter++,           // <-- THREE.Object3D.id (what futureScore passes)
                userData:{ id:n.id, label:n.label, neighbors:[], embedding:createEmbedding() } };
  map.set(n.id, obj);
});
conns.forEach(c=>{ const a=map.get(c.from), b=map.get(c.to);
  if(a&&b){ if(!a.userData.neighbors.includes(c.to)) a.userData.neighbors.push(c.to);
            if(!b.userData.neighbors.includes(c.from)) b.userData.neighbors.push(c.from);} });
setNeuronMap(map); setEmbeddingNeuronMap(map);

const rewards=new Map(), penalties=new Map(), curiosityMap=new Map();
// give the graph some learned value so futureScore *should* be non-zero
rewards.set('5->6', 8); rewards.set('6->8', 8); rewards.set('8->9', 8); rewards.set('9->11',8);
curiosityMap.set('5->6', 3);

const target = map.get(5);
console.log('neuron passed to futureScore: THREE .id =', target.id, ' | .userData.id =', target.userData.id);
console.log('futureScore(neuron, goal=16, depth=3)  =', futureScore(target, 16, rewards, penalties, curiosityMap, 3));
// what it WOULD return if it used userData.id
const patched = { ...target, id: target.userData.id };
console.log('same call with id = userData.id        =', futureScore(patched, 16, rewards, penalties, curiosityMap, 3));

// sweep every node
let nonzero=0;
for (const n of map.values()) if (futureScore(n,16,rewards,penalties,curiosityMap,3) !== 0) nonzero++;
console.log(`\nfutureScore != 0 for ${nonzero}/${map.size} nodes as actually called from main.js`);
let nonzero2=0;
for (const n of map.values()) if (futureScore({...n,id:n.userData.id},16,rewards,penalties,curiosityMap,3) !== 0) nonzero2++;
console.log(`futureScore != 0 for ${nonzero2}/${map.size} nodes if the id bug were fixed`);

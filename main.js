
// ======================================
// IMPORT EMBEDDING SYSTEM
// ======================================

import {

    createEmbedding,
    trainEmbedding,
    similarity,
    setEmbeddingNeuronMap

} from "./render/embeddings.js";


// ======================================
// IMPORT Q LEARNING
// ======================================

import {

    Q,
    getQ,
    setQ

} from "./render/qlearning.js";


// ======================================
// IMPORT KNOWLEDGE SYSTEM
// ======================================

import {

    conceptRelations

} from "./render/knowledge.js";

// ======================================
// IMPORT SCENE SYSTEM
// ======================================

import {

  scene,
  camera,
  renderer,
  group

} from "./render/scene.js";

// import reasoning UI
import {

  reasoningBox

} from "./render/ui.js";

// ======================================
// IMPORT HELPERS
// ======================================

import {

    normalize,
    dot

} from "./render/helpers.js";


// ======================================
// IMPORT RENDER SYSTEM
// ======================================

import {

    animate,
    setStars

} from "./render/render.js";


// ======================================
// IMPORT SEARCH HELPERS
// ======================================

import {

    setNeuronMap,
    findNeuronById

} from "./render/search.js";


// ======================================
// IMPORT STAR SYSTEM
// ======================================

import {

    createStars

} from "./render/stars.js";


// ======================================
// IMPORT CONNECTION SYSTEM
// ======================================

import {

    connectPoints,
    setConnectionNeuronMap

} from "./render/connections.js";


// ======================================
// IMPORT MEMORY SYSTEM
// ======================================

import {

    transitions,
    rewards,
    penalties,
    signals,
    thoughtTrail,
    curiosityMap,
    episodeRewards

} from "./render/memory.js";


// ======================================
// IMPORT FUTURE PLANNING SYSTEM
// ======================================

import {

    lookAheadScore,
    futureScore

} from "./render/planning.js";


// ======================================
// IMPORT REPLAY SYSTEM
// ======================================

import {

    replayEpisodes,
    setReplayMemory

} from "./render/replay.js";



// import decision scoring system
import {

    calculateDecisionScore

} from "./render/scoring.js";



// import episodic future memory system
import {

    buildEpisodeMap

} from "./render/episodic.js";


// import semantic relationship system
import {

    buildSemanticMap

} from "./render/semantic.js";


// ======================================
// 🧠 LIVE BRAIN HUD
// ======================================

import {

    createHUD,
    updateHUD

} from "./render/hud.js";


// import candidate analysis system
import {

    analyzeCandidate

} from "./render/candidateAnalysis.js";


// ======================================
// IMPORT BEHAVIOR DYNAMICS
// ======================================

import {

    curiosityState,
    confidenceState,
    stressState,
    fatigueState,
    focusState,
    explorationMode,

    updateBehavior

} from "./render/behavior.js";


// create background stars
const stars = createStars();

// give stars to renderer animation
setStars(stars);




// ================== DATA STORAGE ==================

const neuronPositions = [];   // stores positions
const neuronMap = new Map(); // stores neurons by id

// give neuron map to search system
setNeuronMap(neuronMap);

// Embedding system can access all neurons
setEmbeddingNeuronMap(neuronMap);

// give neuron database to connection system
setConnectionNeuronMap(neuronMap);




fetch('neurons.json')
.then(res => res.json())
.then(data => {
  
  data.forEach(n => {
    
    // Create position vector
    const SCALE = 1.0; // or 10 if you want bigger
    
    const pos = new THREE.Vector3(
    n.x * SCALE,
    n.y * SCALE,
    n.z * SCALE
  );
  
  neuronPositions.push(pos);
  
  // Create small sphere (neuron)
  const neuron = new THREE.Mesh(
  new THREE.SphereGeometry(0.10, 13, 13),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);

// Set position
neuron.position.copy(pos);

// Store custom data
neuron.userData = {
  isNeuron: true,
  id: n.id,
  label: n.label,
  type: n.type,
  neighbors: [],   // important for graph brain
  embedding: createEmbedding()
};

// Save in map
neuronMap.set(n.id, neuron);

// Add to scene
group.add(neuron);
});

console.log("✅ Neurons loaded");

// 🧠 INITIAL MEANING TRAINING
neuronMap.forEach((n1) => {
  const label1 = n1.userData.label;
  
  const related = conceptRelations[label1] || [];
  
  neuronMap.forEach((n2) => {
    const label2 = n2.userData.label;
    
    if (related.includes(label2)) {
      trainEmbedding(n1.userData.id, n2.userData.id);
    }
  });
});

// Now load connections
return fetch('connections.json');
})
.then(res => res.json())
.then(data => {
  
  data.forEach(c => {
    
    const n1 = findNeuronById(c.from);
    const n2 = findNeuronById(c.to);
    
    if (!n1 || !n2) return;
    
    // Connect neurons
    connectPoints(n1.position, n2.position, 0x4444ff, c.from, c.to);
  });
  
  console.log("✅ Connections loaded");
});




// ================== 🧠 DECISION MEMORY ==================

// this will store last decision (what AI chose and other options)
let lastDecision = null;   // empty at start


// ================== 🧠 SAVE / LOAD BRAIN ==================

// Save everything (memory → storage)
function saveBrain() {
  
  // 🧠 convert nested Maps properly
  function mapToObj(map) {
    const obj = {};
    map.forEach((v, k) => {
      obj[k] = v instanceof Map ? mapToObj(v) : v;
    });
    return obj;
  }
  
  const data = {
    transitions: mapToObj(transitions),
    rewards: mapToObj(rewards),
    penalties: mapToObj(penalties),
    signals: mapToObj(signals),
    curiosity: mapToObj(curiosityMap),
    chainMemory: mapToObj(chainMemory)
  };
  
  localStorage.setItem("brain", JSON.stringify(data));
  
  console.log("🧠 Brain saved safely");
}


// Load everything back (storage → memory)
function loadBrain() {
  
  const raw = localStorage.getItem("brain");
  
  if (!raw) {
    console.log("🧠 No saved brain");
    return;
  }
  
  const data = JSON.parse(raw);
  
  // 🧠 convert object back to Map
  function objToMap(obj) {
    const map = new Map();
    
    for (let key in obj) {
      
      if (typeof obj[key] === "object" && obj[key] !== null) {
        map.set(Number(key), objToMap(obj[key]));
      } else {
      map.set(Number(key), obj[key]);
    }
  }
  
  return map;
}

// restore safely
transitions.clear();
Object.entries(data.transitions || {}).forEach(([k, v]) => {
  transitions.set(Number(k), objToMap(v));
});

rewards.clear();
Object.entries(data.rewards || {}).forEach(([k, v]) => {
  rewards.set(k, v);
});

penalties.clear();
Object.entries(data.penalties || {}).forEach(([k, v]) => {
  penalties.set(k, v);
});

signals.clear();
Object.entries(data.signals || {}).forEach(([k, v]) => {
  signals.set(k, v);
});

curiosityMap.clear();
Object.entries(data.curiosity || {}).forEach(([k, v]) => {
  curiosityMap.set(k, v);
});

chainMemory.clear();
Object.entries(data.chainMemory || {}).forEach(([k, v]) => {
  chainMemory.set(k, objToMap(v));
});

console.log("🧠 Brain loaded safely");
}


let currentGoal = null;  // what brain wants right now
// sequence memory (pattern -> next)
const chainMemory = new Map();

// ===============================
// FULL EPISODE MEMORY
// Stores complete experiences
// Example:
// ["lion","hunt","meat","eat"]
// ===============================
const episodes = [];

// give memories to replay system
setReplayMemory({

    episodes,
    neuronMap,
    transitions,
    rewards

});

const attentionMap = new Map();   // create attention memmory ( focus strength)
// stores last time each path was used
const timeMemory = new Map();
// Target goal (brain wants to reach this)
let goalNeuronId = null;

loadBrain(); // restores saved memory when page starts
setInterval(saveBrain, 5000);   // save brain every 5 seconds automatically


// 🧠 REACHABILITY CHECK (true reasoning)
// This function checks: "Can this node reach the goal in few steps?"
function canReachGoal(startId, goalId, maxDepth = 4) {
  
  // If no goal → allow everything
  if (!goalId) return true;
  
  const visited = new Set(); // remember visited nodes
  
  // DFS = explore neighbors step by step
  function dfs(currentId, depth) {
    
    // stop if depth finished
    if (depth === 0) return false;
    
    // 🎯 reached goal → success
    if (currentId === goalId) return true;
    
    visited.add(currentId);
    
    const neuron = findNeuronById(currentId);
    if (!neuron) return false;
    
    // check all neighbors
    for (let nextId of neuron.userData.neighbors) {
      
      // skip already visited (avoid loop)
      if (visited.has(nextId)) continue;
      
      // if ANY path reaches goal → true
      if (dfs(nextId, depth - 1)) return true;
    }
    
    return false; // no path found
  }
  
  return dfs(startId, maxDepth);
}



function runPrediction(startKey) {
  
  let currentKey = startKey;

  // ======================================
  // 🧠 safe memory size
  // if recentMemory exists use it
  // otherwise use thoughtTrail
  // ======================================

  const memorySize =

  typeof recentMemory !== "undefined"

  ? recentMemory.length

  : thoughtTrail.length;

  // ======================================
  // 🧠 stores all imagined future branches
  // ======================================

  const thoughtTree = [];
  
  // ======================================
  // 🧠 dynamic thinking depth
  // bigger memory = deeper imagination
  // ======================================

  const STEPS = Math.min(

      2 + (memorySize * 2),

      12

  );
  
  for (let step = 0; step < STEPS; step++) {
    // Define starNeuron
    const startNeuron = findNeuronById(currentKey);
    if (!startNeuron) return;
    
    const memoryMap = transitions.get(currentKey) || new Map();
    // get last 2 clicks pattern
    const recentPattern = thoughtTrail.slice(-2).join("->");
    // get learned next predictions
    const chainMap = chainMemory.get(recentPattern) || new Map();
    
    // ======================================
    // 🧠 BUILD EPISODIC FUTURE MEMORY
    // ======================================

    const episodeMap =

    buildEpisodeMap({

        episodes,

        neuronMap,

        currentKey

    });

    const structureMap = new Map();
    startNeuron.userData.neighbors.forEach(id => {
      structureMap.set(id, 1);
    });
    
    // ======================================
    // 🧠 BUILD SEMANTIC RELATIONSHIPS
    // ======================================

    const embeddingMap =

    buildSemanticMap({

        neuronMap,

        currentKey,

        startNeuron

    });
  
  
  
  if (!startNeuron) return;
  
  // Get neighbors (graph brain)
  startNeuron.userData.neighbors.forEach(id => {
    structureMap.set(id, 1);
  });
  
  const choices = [];
  
  // Memory weight
  memoryMap.forEach((value, k) => {
    
    // Block very bad paths
    if (penalties.get(currentKey + "->" + k) > 10) {
      return;
    }
    
    // Block paths that cannot reach goal
    if (goalNeuronId !== null && !canReachGoal(k, goalNeuronId)) {
      return;                         // skip this option completely
    }
    
    // skip Bad Paths
    // If this node cannot reach goal -> ignore it completely
    if (goalNeuronId && !canReachGoal(k, goalNeuronId)) {
      return;
    }
    
    // ======================================
    // 🧠 ANALYZE CANDIDATE
    // ======================================

    const analysis =

    analyzeCandidate({

        currentKey,

        candidateKey: k,

        startNeuron,

        penalties,
        signals,
        timeMemory,

        goalNeuronId,

        canReachGoal

    });




    // invalid candidate
    if (!analysis) return;




    // unpack analysis
    const {

        targetNeuron,

        label1,
        label2,

        score,

        meaningBoost,

        attention,

        signal,

        timeScore,

        goalBoost

    } = analysis;
  
  
  
  // Goal BOOST (how close to goal)
  //let goalBoost = 0;
  //if (currentGoal && label2 === currentGoal) {
    //goalBoost = 15;                              // direct hit
    //}
  
  
  const focus = attentionMap.get(k) || 0;
  
  const chainBoost = (chainMap.get(k) || 0) * 0.7;     // penalty for wrong chains
  
  
  // get reward value for this path
  const reward = rewards.get(currentKey + '->' + k) || 0;
  // punishment bad paths
  const penalty = penalties.get(currentKey + '->' + k) || 0;
  // curiosity (less visited = more interesting)
  const curKey = currentKey + "->" + k;
  const visits = curiosityMap.get(curKey) || 0;
  // ================== 🧠 REAL BRAIN LOGIC ==================

  // low visits = curious
  // high visits = less curious
  const curiosityBoost =
  1 / Math.sqrt(visits + 1); // curiosity naturally fades

  // repeated path becomes trusted habit
  const habitBoost =
  Math.log(visits + 1) * 1.5; // confidence increases slowly

  // too repetitive = boring
  const boredomPenalty =
  visits * 0.25; // brain gets bored of same thing
  
  // 🧠 get learned Q value (real intelligence)
  const qValue = getQ(currentKey, k);

  // ======================================
  // 🧠 HUMAN TRAINED TRANSITION POWER
  // strongly trust learned paths
  // ======================================

  // how strong this path was learned
  const transitionStrength = value;

  // safely scale huge memory values
  const transitionBoost =
  Math.log(transitionStrength + 1) * 4;

  // debug
  console.log(
      "🧠 transition boost:",
      k,
      transitionBoost
  );
  
  // ================== SMARTER DECISION SCORE ==================
  
  // reward learned chains naturally
  // example:
  // lion -> hunt -> meat -> eat
  const chainReward =
  (chainMap.get(k) || 0) * 3.5;
  
  // future planning bonus
  // brain asks:
  // "can this path help reach goal later?"
  // 🧠 imagine future chain
  const imaginedFuture =
  futureScore(k, 4);

  // future planning bonus
  const futureBonus =
  imaginedFuture * 1.5;
  
  // slight penalty for dangerous paths
  const dangerPenalty =
  penalty * 1.5;
  
  // ======================================
  //CALCULATE FINAL INTELLIGENCE SCORE
  // ======================================

  const finalWeight =

  calculateDecisionScore({

      transitionBoost,

      qValue,

      reward,

      habitBoost,

      curiosityBoost,

      chainReward,

      meaningBoost,

      futureBonus,

      boredomPenalty,

      dangerPenalty,

      // ======================================
      // 🧠 BEHAVIOR DYNAMICS
      // ======================================

      curiosityState,

      confidenceState,

      stressState,

      fatigueState,

      focusState,

  });
  
  
  // ======================================
  // 🧠 UPDATE LIVE BRAIN HUD
  // ======================================

  updateHUD({

      // emotional states
      curiosityState,
      confidenceState,
      stressState,
      fatigueState,
      focusState,

      // intelligence
      qValue,
      futureBonus,
      finalWeight,

      // current thinking
      currentThought:
      label1 + " -> " + label2

  });


  choices.push({
    key: k,
    weight: finalWeight
  });


  // ======================================
  // 🧠 UPDATE INTERNAL BRAIN STATE
  // brain emotions evolve over time
  // ======================================

  updateBehavior({

      // reward strengthens confidence
      reward,

      // punishment increases stress
      penalty,

      // success if reward larger than penalty
      success: reward > penalty,

      // repeated path detection
      repeated: visits > 5

  });


});
// ___
//  __________________________________________________________________________________________

// pick single best choice (highest weight)
//const best = choices.sort((a,b) => b.weight - a.weight)[0];

//let chosenKey = null;
//if (best) {
  //chosenKey = best.key;       // remember what brain picked
  //}
// reward system (strengthen correct path)
//if (best) {
  //const rewardKey = currentKey + "-" + best.key;
  //rewards.set(rewardKey, (rewards.get(rewardKey) || 0) + 1);
  //}
// punish other wrong choices
//choices.forEach(c => {
  //if (c.key !== chosenKey) {
    //const badKey = currentKey + "_" + c.key;
    //penalties.set(badKey, (penalties.get(badKey) || 0) + 0.5);
    //}
  //});

// Multi prediction (top 3)

// 🎲 STEP 4 — RANDOM EXPLORATION (PUT EXACTLY HERE)
if (Math.random() < 0.1 && choices.length > 0) {
  const randomChoice = choices[Math.floor(Math.random() * choices.length)];
  currentKey = randomChoice.key;
  return; // stop normal decision → explore instead
}

// 🎲 exploration → sometimes try random path
const epsilon = 0.2;   // 20% randomness

if (Math.random() < epsilon && choices.length > 0) {
  
  const randomChoice =
  choices[Math.floor(Math.random() * choices.length)];
  
  currentKey = randomChoice.key;  // jump randomly
  return; // stop here (skip greedy choice)
}

const sorted = choices.sort((a, b) => b.weight - a.weight);

// ================== 🧠 SAVE DECISION ==================

// best option (highest score)
const bestChoice = sorted[0];

// save decision info for later explanation
lastDecision = {
  current: currentKey,         // where agent is now
  best: bestChoice,            // chosen path
  all: sorted.slice(0, 3)      // top 3 options (for comparison)
};


// Structure weight
structureMap.forEach((value, k) => {
  
  // Block paths that cannot reach goal
  if (goalNeuronId !== null && !canReachGoal(k, goalNeuronId)) {
    return;                         // skip this option completely
  }
  
  // skip nodes that can't reach goal
  if (goalNeuronId && !canReachGoal(k, goalNeuronId)) {
    return;
  }
  
  const targetNeuron = findNeuronById(k);
  if (!targetNeuron) return;
  
  const label1 = startNeuron.userData.label;
  const label2 = targetNeuron.userData.label;
  
  // logic filter
  if (conceptRelations[label1]) {
    if (!conceptRelations[label1].includes(label2)) {
      return;
    }
  }
  
  const score =
  similarity(startNeuron.userData.embedding, targetNeuron.userData.embedding);
  
  if (!choices.find(c => c.key === k)) {
    choices.push({
      key: k,
      weight: score
    });
  }
});

embeddingMap.forEach((value, k) => {
  
  // Block paths that cannot reach goal
  if (goalNeuronId !== null && !canReachGoal(k, goalNeuronId)) {
    return;                         // skip this option completely
  }
  
  // skip nodes that can't reach goal
  if (goalNeuronId && !canReachGoal(k, goalNeuronId)) {
    return;
  }
  
  const targetNeuron = findNeuronById(k);
  if (!targetNeuron) return;
  
  const label1 = startNeuron.userData.label;
  const label2 = targetNeuron.userData.label;
  
  // logic filter
  if (conceptRelations[label1]) {
    if (!conceptRelations[label1].includes(label2)) {
      return;
    }
  }
  
  if (!choices.find(c => c.key === k)) {
    choices.push({
      key: k,
      weight: value
    });
  }
});

if (choices.length === 0) return;

// ===== SOFTMAX =====

let expSum = 0;

choices.forEach(c => {
  c.exp = Math.exp(c.weight);
  expSum += c.exp;
});

// Convert to probability
choices.forEach(c => {
  c.prob = c.exp / expSum;
});

// confidence = how strong top choices is
const topProb = choices[0]?.prob || 0;
const confidence = topProb; // 0 -> unsure, 1 -> very sure

// Sort highest first
choices.sort((a, b) => b.prob - a.prob);

// Take top 3
// 🧠 if confident → take 1 path
// 🧠 if unsure → explore more
let topChoices;

if (confidence > 0.7) {
  topChoices = choices.slice(0, 1); // focused
} else if (confidence > 0.4) {
topChoices = choices.slice(0, 2); // medium
} else {
topChoices = choices.slice(0, 3); // explore
}

topChoices.forEach(choice => {

  // find next neuron safely
  const neuron =
  findNeuronById(choice.key);

  // find current neuron safely
  const prevNeuron =
  findNeuronById(currentKey);

  // 🛑 safety system
  // stop crashes immediately
  if (
      !neuron ||
      !prevNeuron ||
      !neuron.position ||
      !prevNeuron.position
  ) {

      console.log(
          "❌ Missing neuron in prediction",
          choice.key,
          currentKey
      );

      return;
  }
  
  // Draw line
  const geometry = new THREE.BufferGeometry().setFromPoints([
  prevNeuron.position,
  neuron.position
  ]);
  
  const material = new THREE.LineBasicMaterial({
    color: new THREE.Color().setHSL(
    0.7 - choice.prob * 0.7,
    1,
    0.4 + choice.prob * 0.4
    ),
    transparent: true,
    opacity: 0.2 + choice.prob * confidence   // confident = brighter path, confused = faint paths
  });
  
  const line = new THREE.Line(geometry, material);
  
  group.add(line);
  
  // remove after time
  setTimeout(() => group.remove(line), 1000);
  
  // ===== DOT FLOW =====
  const dot = new THREE.Mesh(
  new THREE.SphereGeometry(0.05, 8, 8),
  new THREE.MeshBasicMaterial({ color: 0x00ffff })
);

dot.userData = {
  start: prevNeuron.position.clone(),
  end: neuron.position.clone(),
  progress: 0
};

group.add(dot);

const interval = setInterval(() => {
  
  dot.userData.progress += 0.05;
  
  if (dot.userData.progress >= 1) {
    group.remove(dot);
    clearInterval(interval);
    return;
  }
  
  dot.position.lerpVectors(
  dot.userData.start,
  dot.userData.end,
  dot.userData.progress
);

}, 30);
});

// ___________________________________________________________________________________________
//________________________________________________________________________________

// Move forward
let nextKey = topChoices[0].key;

// prevent immediate repeat
if (nextKey === currentKey && topChoices.length > 1) {
  nextKey = topChoices[1].key;
}

// prevent A -> B -> A loops
if (thoughtTrail.length >= 2) {
  
  const prev = thoughtTrail[thoughtTrail.length - 2];
  
  if (nextKey === prev && topChoices.length > 1) {
    nextKey = topChoices[1].key;
  }
}
// Save real AI prediction
window.lastReasoning = {
  from: currentKey,
  to: nextKey
};

// ======================================
// 🧠 save imagined path into tree
// ======================================

thoughtTree.push({

    from: currentKey,

    to: nextKey,

    step: step

});


currentKey = nextKey;
}

// ======================================
// 🧠 DRAW THOUGHT TREE
// visual future imagination
// ======================================

thoughtTree.forEach(branch => {

    // get neurons
    const fromNeuron =
    findNeuronById(branch.from);

    const toNeuron =
    findNeuronById(branch.to);

    // safety check
    if (!fromNeuron || !toNeuron) return;

    // create glowing line
    const geometry =
    new THREE.BufferGeometry().setFromPoints([

        fromNeuron.position,

        toNeuron.position

    ]);

    // deeper thoughts = different color
    const material =
    new THREE.LineBasicMaterial({

        color: new THREE.Color().setHSL(

            0.6 - (branch.step * 0.05),

            1,

            0.5

        ),

        transparent: true,

        opacity: 0.3

    });

    // create visual line
    const line =
    new THREE.Line(geometry, material);

    // add to scene
    group.add(line);

    // remove later
    setTimeout(() => {

        group.remove(line);

    }, 3000);

});

return currentKey;
}



animate();                           // start loop


// ======================================
// 🧠 START LIVE BRAIN HUD
// ======================================

createHUD();


// ================== 🤖 AI AGENT SYSTEM ==================
// ***********************************************************************

// ================== 🤖 AGENT STATE ==================

// is AI currently running automatically?
let agentRunning = false;

// speed of thinking (ms)
let agentSpeed = 500; // little fast

// where agent is currently thinking
let agentCurrent = null;

// remember last position of agent (used for learning)
let agentLast = null;         // this stores where i was before

// stores loop timer
let loopId = null;

// ================== 🤖 AGENT THINK LOOP ==================

function runAgent() {
  // ===============================
  // RECENT MEMORY
  // prevents endless loops
  // ===============================
  
  // stores recently visited neurons
  if (!window.recentMemory) {
    window.recentMemory = [];
  }
  
  if (Math.random() < 0.1) {                // only 10% of time
    // 🧠 slowly forget old curiosity (keeps brain flexible)
    curiosityMap.forEach((value, key) => {
      curiosityMap.set(key, value * 0.995); // slow decay
    });
  }
  
  // 🟢 STEP 5 — DECAY PENALTY (PUT HERE AT TOP)
  penalties.forEach((value, key) => {
    penalties.set(key, value * 0.98); // slowly forget bad paths
  });
  
  // 🧠 slowly forget rewards
  rewards.forEach((value, key) => {
    rewards.set(key, value * 0.995);
  });
  
  // 🧠 slowly forget transitions
  transitions.forEach((map, state) => {
    
    map.forEach((v, action) => {
      map.set(action, v * 0.995);
    });
    
  });
  
  // 🧠 slowly decay Q values
  Q.forEach((value, key) => {
    Q.set(key, value * 0.999);
  });
  
  // if turned OFF → stop immediately
  if (!agentRunning) return;
  
  // 🧠 if no current position → pick random neuron
  if (!agentCurrent) {
    
    const allIds = Array.from(neuronMap.keys()); // get all neuron IDs
    
    // pick random start point
    agentCurrent = allIds[Math.floor(Math.random() * allIds.length)];
    
    console.log("🤖 Start from:", agentCurrent);
  }
  
  // 🧠 OPTIONAL: sometimes set a random goal (makes it smart)
  if (Math.random() < 0.1) {
    
    const allIds = Array.from(neuronMap.keys());
    
    goalNeuronId = allIds[Math.floor(Math.random() * allIds.length)];
    
    console.log("🎯 New goal:", goalNeuronId);
  }
  
  // 🧠 THINK → run your prediction system
  // 🧠 RUN BRAIN (decide where to go)
  // ================== SMART AUTONOMOUS TRAINING ==================

  // sometimes continue current thought
  if (Math.random() < 0.7) {

    runPrediction(agentCurrent);

  }

  // sometimes replay old successful paths
  // ===============================
  // 🧠 DREAM REPLAY MODE
  // brain trains from old memories
  // ===============================

  else {
      // replay full successful episodes
      replayEpisodes();
  }
  
  // ================== 🧠 FULL DECISION REASONING ==================
  
  // ✅ FULL SAFE CHECK (very important)
  if (
  lastDecision &&                 // decision exists
  lastDecision.current != null && // current exists
  lastDecision.best &&            // best exists
  lastDecision.best.key != null &&// best.key exists
  lastDecision.all &&             // all choices exist
  Array.isArray(lastDecision.all) // make sure it's an array
  ) {   // only run if decision exists
    
    // get neurons safely
    // use REAL reasoning path
    const reasoning =
      window.lastReasoning;

    if (!reasoning) return;

    const currentNeuron =
      findNeuronById(reasoning.from);

    const bestNeuron = findNeuronById(lastDecision.best.key);
    
    if (
    !currentNeuron || !currentNeuron.userData ||
    !bestNeuron || !bestNeuron.userData
    ) {
      console.log("Missing neuron, skip reasoning");
      return;
    }
    
    let text = "";   // text that will be shown
    
    // ================== ✅ WHY CHOSEN ==================
    
    text += "✅ Chose: " +
    currentNeuron.userData.label + " → " +
    bestNeuron.userData.label +
    " (score: " + lastDecision.best.weight.toFixed(2) + ")\n";
    
    text += "\n❌ Not chosen:\n";
    
    // ================== ❌ WHY NOT OTHERS ==================
    
    lastDecision.all.forEach(choice => {
      if (!choice || choice.key == null) return;
      
      // skip best (already shown)
      if (choice.key === lastDecision.best.key) return;
      
      const neuron = findNeuronById(choice.key);
      
      //skip if neuron not found
      if (!neuron || !neuron.userData) return;
      
      let reason = "";
      
      // simple rules to explain decision
      if (choice.weight < lastDecision.best.weight * 0.5) {
        reason = "low score";   // much weaker
      }
      else if (penalties.get(lastDecision.current + "->" + choice.key)) {
        reason = "penalty high";  // punished before
      }
      else {
        reason = "less optimal";  // okay but not best
      }
      
      text += "- " +
      currentNeuron.userData.label + " → " +
      neuron.userData.label +
      " (" + reason + ")\n";
    });
    
    // ================== 🖥 SHOW ON SCREEN ==================
    
    reasoningBox.innerText = text;   // update UI box
    
    // also print in console
    console.log(text);
  }
  
  // ================== 🧠 REASONING VOICE ==================
  
  
  // get last predicted step (from thoughtTrail)
  const reasoning = window.lastReasoning;
  if (!reasoning) return;
  const currentNeuron = findNeuronById(reasoning.from);

  let nextStep = reasoning.to;
  
  // get next neuron object
  const nextNeuron = findNeuronById(nextStep);
  
  // if both exist → explain reasoning
  if (!currentNeuron || !nextNeuron) return;
  
  // 🧠 ================== DEEP REASONING ==================
  
  // 🛑 safety (don't crash)
  if (!currentNeuron || !nextNeuron) return;
  
  // 🧠 1. SIMILARITY (how related ideas are)
  const sim = similarity(
  currentNeuron.userData.embedding,
  nextNeuron.userData.embedding
);

// 🧠 2. REWARD (good past memory)
const key = currentNeuron.userData.id + "->" + nextStep;

// ======================================
// 🚫 STOP SELF-LOOP THINKING
// prevents:
// eat -> eat
// drink -> drink
// food -> food
// ======================================

// current neuron id
const currentId =
currentNeuron.userData.id;

// if brain tries to stay
// on same neuron
if (currentId === nextStep) {

    console.log(
        "🚫 self-loop blocked:",
        currentId
    );

    return;
}

let reward = rewards.get(key) || 0;

// ======================================
// 🧠 BOREDOM SYSTEM
// repeated same path becomes boring
// ======================================

const repeatKey =
agentLast + "->" + nextStep;

// how many times used
const repeatCount =
curiosityMap.get(repeatKey) || 0;

// too repetitive = punish it
if (repeatCount > 5) {

    reward -= repeatCount * 0.5;

    console.log(
      " boring path reduces:",
      repeatKey
    );

}

// 🧠 3. PENALTY (bad past memory)
const penalty = penalties.get(key) || 0;

// 🧠 4. CURIOSITY (new/unexplored path)
const visits = curiosityMap.get(key) || 0;
// curiosity fades naturally
const curiosity =
1 / Math.sqrt(visits + 1);

// repeated paths become confident habits
const habit =
Math.log(visits + 1);

// ==========================================
// 🧠 FULL EPISODE MEMORY BONUS
// example:
// lion->hunt->meat->eat
// brain rewards full successful strategy
// ==========================================

// convert recent memory into one full path
const pathKey = recentMemory.join("->");

// =======================================
// 🧠 LONG CHAIN INTELLIGENCE BONUS
// longer meaningful episodes
// become much stronger
// =======================================

// old learned memory
const oldEpisodeStrength =
episodeRewards.get(pathKey) || 0;

// chain length
const chainLength =
recentMemory.length;

// ======================================
// 🧠 INTELLIGENT EPISODIC BONUS
//
// short path:
// food -> eat
//
// gets small bonus
//
// long smart path:
// lion -> hunt -> meat -> eat
//
// gets HUGE bonus
// ======================================

// square the chain length
// longer stories become exponentially stronger
const lengthBonus =

Math.pow(chainLength, 3);

// final episodic memory bonus
const episodeMemoryBonus =

oldEpisodeStrength *

lengthBonus *

0.5;
// stronger remembered episodes
// get bigger thinking score

// ================== 🧠 REAL REASONING SCORE ==================
// ===============================
// 🧠 ADVANCED COGNITIVE SCORE
// ===============================

const score =

    // semantic meaning
    sim * 1.5 +

    // learned reward
    reward * 3 +

    // trusted habit
    habit * 2 +

    // exploration
    curiosity * 1.2 +

    // episodic memory
    episodeMemoryBonus * 4 +

    // reward long thinking chains
    recentMemory.length * 3 -

    // avoid danger
    penalty * 2;

// 🛡️ LIMIT FINAL SCORE (VERY IMPORTANT FOR STABILITY)

// clamp maximum value (prevents explosion)
const MAX_SCORE = 100; // you can tune (50–150 range)

// clamp minimum value (prevents extreme negatives)
const MIN_SCORE = -50;

// apply safe bounds
const safeScore = Math.max(MIN_SCORE, Math.min(score, MAX_SCORE));

// 🎯 goal understanding
let goalInfo = "";
if (goalNeuronId !== null) {
  if (nextStep === goalNeuronId) {
    goalInfo = "🎯 directly reaching goal!";
  } else {
  goalInfo = "➡️ moving toward goal";
}
}

// ===============================
// 🧠 REAL EPISODE INTELLIGENCE
// measures quality of thinking
// ===============================

const episodeScore =

    reward * 10 +

    sim * 5 +

    episodeMemoryBonus * 20 +

    habit * 5 -

    penalty * 10;



// 🖥️ PRINT FULL THINKING (console)
console.log(
"🧠 Thinking:",
currentNeuron.userData.label,
"->",
nextNeuron.userData.label,
"\n similarity:", sim.toFixed(2),
"\n reward:", reward.toFixed(2),
"\n penalty:", penalty.toFixed(2),
"\n curiosity:", curiosity.toFixed(2),
"\n 👉 final score:", safeScore.toFixed(2),
"\n episode score:", episodeScore,              // SHOW EPISODE PLANNING POWER
"\n", goalInfo
);

// get learned Q value
const qVal = getQ(currentNeuron.userData.id, nextNeuron.userData.id);

// print Q value
console.log("🧠 Q-value:", qVal.toFixed(2));

// 📺 SHOW ON SCREEN (visual brain)
reasoningBox.innerText =
"🧠 Thinking:\n" +
currentNeuron.userData.label +
" → " +
nextNeuron.userData.label +

"\n\n similarity: " + sim.toFixed(2) +
"\n reward: " + reward.toFixed(2) +
"\n penalty: " + penalty.toFixed(2) +
"\n curiosity: " + curiosity.toFixed(2) +

"\n\n FINAL SCORE: " + safeScore.toFixed(2) +
"\n\n" + goalInfo;


// ================== 🧠 SHOW ON SCREEN ==================

// ================== 🧠 SHOW FULL THINKING ON SCREEN ==================

reasoningBox.innerText =

"🧠 Thinking: " +
currentNeuron.userData.label +
" → " +
nextNeuron.userData.label +

"\n\n🔵 Similarity: " + sim.toFixed(2) +

"\n⭐ Reward: " + reward.toFixed(2) +

"\n❌ Penalty: " + penalty.toFixed(2) +

"\n🟣 Curiosity: " + curiosity.toFixed(2) +

"\n🧠 Q-value: " + qVal.toFixed(2) +

"\n\n👉 Final Score: " + safeScore.toFixed(2) +

"\n\n" + goalInfo;


// 🧠 try to get next step from memory (last prediction)
let next = null;

// if we have any history
if (window.lastReasoning) {
  next = window.lastReasoning.to;
  // 👉 last visited neuron = next step
}


// ================== 🧠 SELF LEARNING ==================

// if we have previous and current step
if (agentLast !== null && next !== null) {
  
  // ================== 🧠 Q-LEARNING CORE ==================
  
  // learning rate → how fast brain learns
  const alpha = 0.1;
  
  // discount → how much future matters
  const gamma = 0.9;
  
  // reward signal (what happened after action)
  let rewardSignal = 0;
  
  // 🎯 if reached goal → big reward
  if (next === goalNeuronId) {
    rewardSignal = 10;   // success reward
  } else {
  rewardSignal = -0.1; // small penalty each step (to encourage faster path)
}

// get current Q value for (state → action)
const currentQ = getQ(agentLast, next);

// find best future Q from next state
let maxFutureQ = 0;

// get next neuron object
const nextNeuronObj = findNeuronById(next);

// check all future options
if (nextNeuronObj) {
  nextNeuronObj.userData.neighbors.forEach(n => {
    
    // take maximum Q from next possible moves
    maxFutureQ = Math.max(maxFutureQ, getQ(next, n));
    
  });
}

// 🧠 Q-learning formula
const newQ =
currentQ +                                  // old knowledge
alpha * (                                   // learning speed
rewardSignal +                            // immediate reward
gamma * maxFutureQ -                      // future reward
currentQ                                  // remove old bias
);

// save updated value
setQ(agentLast, next, newQ);

// debug print
console.log("🧠 Q updated:", agentLast, "→", next, "=", newQ.toFixed(2));

const prev = agentLast; // 👉 where we were before
const current = next;      // 👉 where we moved now

// 🧪 curiosity = "I explored this path"
const key = prev + "->" + current;

// get old curiosity (how many times we explored this path)
const oldCuriosity = curiosityMap.get(key) || 0;        // if not exist -> starts from zero

// increase curiosity slowly (small step = stable learning)
let newCuriosity = oldCuriosity + 0.05;                 // small increment

// set maximum limit
const MAX_CURIOSITY = 5;                                // brain cannot over-focus beyond this

// clamp value safely
newCuriosity = Math.min(newCuriosity, MAX_CURIOSITY);

// Save update curiosity back to memory
curiosityMap.set(
key,
newCuriosity                                        // store controlled value
);

// ===============================
// 🏆 2. REWARD (goal reached)
// ===============================
if (current === goalNeuronId) {

  // =====================================
  // SAVE FULL SUCCESSFUL EPISODE
  // Example:
  // lion -> hunt -> meat -> eat
  // =====================================

  // Convert neuron IDs into words
  const episodeWords = thoughtTrail.map(id => {
      const n = neuronMap.get(id);
      return n ? n.userData.label : id;
  });

  // Save only if episode is long enough
  if (episodeWords.length >= 3) {

      // Store full episode
      episodes.push([...episodeWords]);

      // keep only latest 200 episodes
      if (episodes.length > 200) {
        episodes.shift();
      }

      console.log(
          "🧠 Episode stored:",
          episodeWords.join(" -> ")
      );
  }
  
  rewards.set(
  key,
  (rewards.get(key) || 0) + 1
  );
  // ================== REWARD WHOLE RECENT PATH ==================

  // reward all recent successful thoughts
  for (let i = 0; i < recentMemory.length - 1; i++) {

    const from = recentMemory[i];
    const to = recentMemory[i + 1];

    const pathKey = from + "->" + to;

    rewards.set(
        pathKey,
        (rewards.get(pathKey) || 0) + 0.5
    );
  }
}

// ===============================
// ⚠️ 3. PENALTY (wrong path), this path was not good
// ===============================
else {
  
  penalties.set(
  key,
  (penalties.get(key) || 0) + 0.3
);
}




// ================== 🧠 MEMORY LEARNING ==================

const map = transitions.get(prev) || new Map();
// 👉 get memory of previous neuron

map.set(current, (map.get(current) || 0) + 1);
// 👉 increase strength of this path

transitions.set(prev, map);
// 👉 save back to memory

// ================== 🎯 REWARD SYSTEM ==================

if (goalNeuronId && current === goalNeuronId) {

    // 👉 if we reached goal

    const key = prev + "->" + current; // current successful step

    rewards.set(
        key,
        (rewards.get(key) || 0) + 3
    ); // give normal reward

    console.log("🎉 Goal-reached → reward!"); // show success



    // ==========================================
    // 🧠 LONG-TERM EPISODIC MEMORY REINFORCEMENT
    // reward COMPLETE successful chain
    // example:
    // lion -> hunt -> meat -> eat
    // ==========================================

    recentMemory.forEach((step, i) => {

        const old = episodeRewards.get(step) || 0; // old memory strength

        episodeRewards.set(                       // strengthen full successful chain

            step,

            old + ((i + 1) * 2)

            // later steps get stronger reward
            // lion->hunt = +2
            // hunt->meat = +4
            // meat->eat = +6

        );

    });



    console.log("🧠 Full episode reinforced");

}

// ================== ❌ PENALTY SYSTEM ==================

if (safeScore < 0){                              // only punish very bad path
  // 👉 sometimes punish random paths
  
  const badKey = prev + "->" + current;
  
  penalties.set(badKey, (penalties.get(badKey) || 0) + 0.1);
}

// ================== ⚡ SIGNAL SYSTEM ==================

const signalKey = prev + "->" + current;

signals.set(signalKey, (signals.get(signalKey) || 0) + 1);       // 👉 stronger signal = more important path


// ================== ⏱ TIME MEMORY ==================

const timeKey = prev + "->" + current;

timeMemory.set(timeKey, Date.now());
// 👉 remember when this path was used

console.log("🧠 Self learned:", prev, "→", current);
}

// ================== UPDATE MEMORY ==================

agentLast = agentCurrent;                       // 👉 store current as "previous" for next step


// ================== MOVE FORWARD ==================

if (next !== null) {
  agentCurrent = next;
  // 👉 agent moves to next neuron

  // ======================================
  // 🧠 VISUAL TRAINING FLOW
  // show brain movement during learning
  // ======================================

  // get neurons
  const fromNeuron =
  findNeuronById(agentLast);

  const toNeuron =
  findNeuronById(next);

  // safety check
  if (fromNeuron && toNeuron) {

      // create line
      const geometry =
      new THREE.BufferGeometry().setFromPoints([

          fromNeuron.position,

          toNeuron.position

      ]);

      // glowing learning color
      const material =
      new THREE.LineBasicMaterial({

          color: 0x00ffff,

          transparent: true,

          opacity: 0.8

      });

      // create visual path
      const line =
      new THREE.Line(geometry, material);

      group.add(line);

      // remove later
      setTimeout(() => {

          group.remove(line);

      }, 1500);

      // ======================================
      // moving thought dot
      // ======================================

      const dot =
      new THREE.Mesh(

          new THREE.SphereGeometry(0.05, 8, 8),

          new THREE.MeshBasicMaterial({

              color: 0xffff00

          })

      );

      dot.userData = {

          start: fromNeuron.position.clone(),

          end: toNeuron.position.clone(),

          progress: 0

      };

      group.add(dot);

      // animate flow
      const interval = setInterval(() => {

          dot.userData.progress += 0.03;

          // reached destination
          if (dot.userData.progress >= 1) {

              group.remove(dot);

              clearInterval(interval);

              return;
          }

          // move dot
          dot.position.lerpVectors(

              dot.userData.start,

              dot.userData.end,

              dot.userData.progress

          );

      }, 30);
  }
  
  // add visited neuron to recent memory
  recentMemory.push(agentCurrent);
  // keep memory small
  if (recentMemory.length > 6) {
    recentMemory.shift();
  }
  
  // store thinking history
  thoughtTrail.push(agentCurrent);
  
  // keep trail small
  if (thoughtTrail.length > 6) {
    thoughtTrail.shift();
  }
}


// 🧠 move forward (like brain thinking next step)
//agentCurrent = goalNeuronId || agentCurrent;

}

// ================= SAFE LOOP CONTROLLER =================
function runAgentLoop() {
  
  if (!agentRunning) return; // 🛑 stop if turned off
  
  for (let i = 0; i < 5; i++) {
    runAgent();                    // 5 thinking steps per frame
  }
  
  loopId = setTimeout(runAgentLoop, agentSpeed); // 🔁 repeat safely
  
}

// ================== 🤖 CONTROL ==================

// press SPACE → start / stop AI
window.addEventListener("keydown", (e) => {
  // if SPACE key is pressed
  if (e.code === "Space") {
    
    if (!agentRunning) {
      agentRunning = true;
      console.log("🚀 Agent STARTED");
      runAgentLoop(); // start Safe loop
    } else {
    agentRunning = false;
    console.log("⛔ Agent STOPPED");
    clearTimeout(loopId);                      // stop loop completely
  }
}
});


// ================== CLICK ==================
// memory

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let lastClicked = null;

window.addEventListener('click', (event) => {
  
  // Convert mouse to 3D space
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  
  const intersects = raycaster.intersectObjects(group.children);
  
  if (intersects.length === 0) return;
  
  const obj = intersects.find(i => i.object.userData.isNeuron)?.object;
  
  if (!obj) return;
  
  console.log("Neuron clicked:", obj.userData.label);
  
  // reset colors
  neuronMap.forEach(n => {
    n.material.color.set(0xffffff);
  });
  
  // highlight clicked
  obj.material.color.set(0xff0000);
  
  // highlight neighbors
  obj.userData.neighbors.forEach(id => {
    const n = findNeuronById(id);
    if (n) n.material.color.set(0x00ff00);
  });
  
  // ================== LEARNING (VERY IMPORTANT) ==================
  
  if (window.lastNeuron !== undefined) {
    
    // 🧠 CHAIN LEARNING (NEW)
    if (thoughtTrail.length >= 2) {
      
      const prev = thoughtTrail[thoughtTrail.length - 2];
      const current = thoughtTrail[thoughtTrail.length - 1];
      // curiosity learning (track explored paths)\
      const curKey = prev + "->" + current;
      curiosityMap.set(curKey, (curiosityMap.get(curKey) || 0) + 1);
      
      // strengthen connection
      const map = transitions.get(prev) || new Map();
      map.set(current, (map.get(current) || 0) + 2); // stronger than normal
      transitions.set(prev, map);
      
      // reward chain
      const key = prev + "->" + current;
      rewards.set(key, (rewards.get(key) || 0) + 2);
      
      console.log("🧠 Chain learned:", prev, "→", current);
    }
    
    
    const prev = window.lastNeuron;
    const current = obj.userData.id;
    
    trainEmbedding(prev, current);
    
    // get memory map of previous neuron
    const map = transitions.get(prev) || new Map();
    
    // ======================================
    // 🧠 STRONG HUMAN TRAINING
    // when YOU teach something,
    // brain trusts it strongly
    // ======================================

    map.set(

        current,

        (map.get(current) || 0) + 8

    );
    
    // 🔥 SIGNAL LEARNING
    const signalKey = prev + "->" + current;
    signals.set(signalKey, (signals.get(signalKey) || 0) + 1);
    
    // 🧠 SIGNAL DECAY (forget slowly)
    signals.forEach((value, key) => {
      signals.set(key, value * 0.99);
    });
    
    // ❌ weaken wrong paths
    map.forEach((value, key) => {
      if (key !== current) {
        map.set(key, value * 0.9);
      }
    });
    
    // save back
    transitions.set(prev, map);
    
    console.log("🧠 Learned:", prev, "→", current);
  }
  
  // store current as last
  window.lastNeuron = obj.userData.id;
  
  // 🔥 increase attention for this neuron
  const id = obj.userData.id;
  attentionMap.set(id, (attentionMap.get(id) || 0) + 1);
  
  // decay others (forget old focus)
  attentionMap.forEach((value, key) => {
    if (key !== id) {
      attentionMap.set(key, value * 0.95);
    }
  });
  
  // Run prediction
  console.log("Prediction running")
  
  const clickedId = obj.userData.id;
  // set goal (right-click idea simulated)
  if (event.shiftKey) {                     // normal click -> run prediction, SHIFT + click -> set goal
    goalNeuronId = clickedId;
    console.log(" Goal set:", goalNeuronId);
    return;
  }
  currentGoal = obj.userData.label;         // set goal as clicked label
  
  // save click in memory
  thoughtTrail.push(clickedId);
  
  // keep only last 3 clicks
  if (thoughtTrail.length > 3) {
    thoughtTrail.shift();
  }
  
  // keep only last 5 steps
  if (thoughtTrail.length > 5) {
    thoughtTrail.shift();
  }
  
  // learn pattern like "1-2 → 3"
  if (thoughtTrail.length >= 2) {
    
    const pattern = thoughtTrail.slice(0, -1).join("->"); // "1-2"
    const next = thoughtTrail[thoughtTrail.length - 1];  // "3"
    
    let map = chainMemory.get(pattern);
    
    if (!map) {
      map = new Map();
      chainMemory.set(pattern, map);
    }
    
    map.set(next, (map.get(next) || 0) + 1);
  }
  
  runPrediction(clickedId);
  
  // learning
  //if (window.lastClicked !== undefined) {
    //learn(window.lastClicked, clickedId);
    //}
  
  // 🧠 store time for previous → current
  if (window.lastClicked !== undefined) {
    
    const timeKey = window.lastClicked + "->" + clickedId;
    
    timeMemory.set(timeKey, Date.now());
  }
  
  // update last clicked AFTER storing
  window.lastClicked = clickedId;
  
});

// ================== 🎮 KEY CONTROL ==================

// Press "A" key to start/stop AI
window.addEventListener('keydown', (e) => {
  
  // If key is 'a'
  if (e.key === 'a') {
    
    // Toggle(switch) (ON → OFF, OFF → ON)
    agentActive = !agentActive;
    
    // Show status in console
    console.log("🤖 Agent:", agentActive ? "STARTED" : "STOPPED");
    
    // If turned ON → start thinking
    if (agentActive) agentLoop();
  }
});

// ====================== ANIMATION ======================
//function animate() {
  //requestAnimationFrame(animate);
  //renderer.render(scene, camera);
  //}

//animate();
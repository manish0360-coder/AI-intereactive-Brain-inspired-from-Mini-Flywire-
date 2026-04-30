                  MINI FLYWIRE

An Interactive Emergent Neural System with Memory, Attention, and Future Reasoning

⸻

📌 Abstract

Mini FlyWire is an experimental interactive system designed to simulate how intelligent behavior can emerge from simple neural-like structures. Unlike traditional neural networks trained offline, this system learns in real-time through interaction, forming connections between nodes (neurons), strengthening patterns, and predicting future paths.

The system combines ideas from:
	•	Graph-based intelligence
	•	Embedding similarity
	•	Reinforcement-style reward learning
	•	Attention mechanisms
	•	Temporal decay (memory fading)
	•	Goal-directed reasoning
	•	Look-ahead (future planning)

The result is a living neural system that evolves as the user interacts with it.

⸻

🎯 Goal of the Project

The purpose of Mini FlyWire is not just visualization — it is to:
	•	Bridge the gap between abstract AI concepts and visible behavior
	•	Show how intelligence can emerge step-by-step
	•	Build a system that:
	•	Learns from clicks
	•	Predicts next steps
	•	Adapts over time
	•	Moves toward goals
	•	Thinks ahead (future reasoning)

⸻

🧩 Core Architecture

The system is built on five main layers of intelligence:

⸻

1. 🧠 Graph Structure (Neural Skeleton)

Each neuron is:
	•	A node in 3D space
	•	Connected to other neurons via edges
  •Stored using:
    code -> neuronMap = new Map()

Each neuron contains:
	•	id → unique identity
	•	label → meaning (dog, food, etc.)
	•	neighbors → connected neurons
	•	embedding → vector representation

👉 This forms the basic brain structure

⸻

2. 📐 Embedding System (Meaning Understanding)

Each neuron has a vector:
  code -> embedding = [x, y, z]

Similarity is calculated using:
  dot product

If two neurons are similar:
	•	Their vectors align
	•	Their similarity score increases

⸻

🔥 Training Mechanism

When two neurons are clicked in sequence:
  code -> trainEmbedding(id1, id2)

•	Moves embeddings closer
	•	Pushes unrelated nodes away
	•	Normalizes vectors

👉 This simulates concept learning

⸻

3. 🧠 Memory System (Experience Learning)

Transitions are stored:
  transitions: Map

Example:
  dog → food (3 times)

Stored as:
  code -> transitions.get("dog").get("food") = 3

👉 This represents:
	•	Frequency
	•	Habit
	•	Experience

⸻

4. 🎯 Reward System (Reinforcement Learning)

Paths that are chosen are rewarded:
  code -> rewards.get("dog-food") += 1

👉 This increases probability of:
	•	Reusing successful paths
	•	Strengthening good decisions

⸻

5. ⚡ Signal System (Short-term activation)

Signals represent recent activity:
  code -> signals.get("dog-food")

•	Boosts recently used paths
	•	Decays over time
    value *= 0.99

👉 This simulates:
	•	Neural firing
	•	Temporary importance

⸻

🧠 Advanced Intelligence Layers

⸻

6. 🎯 Attention Mechanism (Focus)

Tracks which neurons are important right now:
  code -> attentionMap

•	Clicked neurons get stronger focus
	•	Others decay
    value *= 0.95

  👉 This mimics:
	    •	Human focus
	    •	Selective thinking

⸻

7. 🧠 Chain Memory (Sequence Learning)

Learns patterns like:
  dog → animal → food

  Stored as:
    code -> chainMemory

  Example:
    "dog-animal" → food

👉 This allows:
	•	Multi-step learning
	•	Pattern prediction

⸻

8. ⏳ Time Decay (Forgetting Mechanism)

Recent actions are stronger than old ones:
  code -> timeScore = Math.exp(-age / 5000)

  👉 Meaning:
	•	New path → strong
	•	Old path → weak

⸻

9. 🧠 Meaning Relations (Concept Knowledge)

Defined manually:
  code -> const conceptRelations = {
  dog: ["animal"],
  cat: ["animal"],
  animal: ["dog", "cat"]
  };

👉 Adds:
	•	Semantic understanding
	•	Logical relationships

⸻

10. 🎯 Goal-Oriented Behavior

User sets a goal neuron.

System calculates:
  code -> goalBoost = similarity(target, goal)

  👉 This makes system:
	  •	Move toward target
	  •	Prefer goal-aligned paths

⸻

11. 🔮 Future Thinking (Look-Ahead Intelligence)

This is the most important step so far.

The system simulates:

“If I go here… can I reach the goal later?”

Implemented using:
  code -> lookAheadScore()

Uses DFS (depth-first search):
  •	Looks 2 steps ahead
  •	Rewards paths that lead to goal

  👉 This transforms system from:

    ❌ reactive →
    ✅ predictive

⸻

⚖️ Final Decision Formula

Each possible next neuron gets a score:
  finalWeight =
  score +          // similarity
  memoryBoost +    // frequency
  reward * 2 +     // success
  signal * 3 +     // recent activity
  focus * 2 +      // attention
  chainBoost * 4 + // sequence memory
  timeScore * 3 +  // recency
  goalBoost +      // direction
  future * 5       // look-ahead

👉 Then:
  softmax → probability

  Top 3 paths are chosen.

⸻

🎨 Visualization System
	•	Nodes = neurons (spheres)
	•	Lines = connections
	•	Moving dots = signal flow
	•	Colors:
	•	🔴 red → selected
	•	🟢 green → neighbors
	•	🔵 blue → prediction paths

⸻

🧪 Behavior Observed

After training:
	•	System prefers learned paths
	•	Avoids weak/unseen paths
	•	Moves toward goals
	•	Shows multi-step reasoning
	•	Produces different predictions based on history

⸻

⚠️ Known Characteristics
	•	Randomness exists (exploration)
	•	Early stage learning is unstable
	•	Needs repeated interaction to stabilize

⸻

🚀 Key Achievement

This system demonstrates:

Intelligence emerging from simple rules, not pre-trained models

It is:
	•	Not supervised learning
	•	Not deep learning
	•	Not static

👉 It is interactive intelligence

⸻

🔬 Research Insight

Mini FlyWire resembles:
	•	Graph Neural Networks (GNNs)
	•	Reinforcement Learning
	•	Cognitive architectures
	•	Biological neural dynamics

But uniquely:

👉 It combines them in a live visual system

⸻

🧠 Current Intelligence Level

Your system now supports:
	•	✔ Memory
	•	✔ Meaning
	•	✔ Attention
	•	✔ Time
	•	✔ Goal
	•	✔ Future reasoning

⸻

🧭 Next Evolution (Not Included Yet)

Future improvements:
	•	Self-correction (learning from mistakes)
	•	Curiosity (exploration)
	•	Confidence (decision certainty)
	•	Planning depth increase
	•	Multi-goal reasoning

⸻

🏁 Conclusion

Mini FlyWire is not just a project — it is a foundation for building thinking systems from scratch.

It shows that:

Intelligence is not a single algorithm
It is a combination of small interacting behaviors
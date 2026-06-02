# MiniFlyWire

A research-oriented cognitive architecture exploring how goal-directed behavior, reinforcement learning, semantic networks, and memory systems can interact inside a self-organizing agent.

MiniFlyWire is inspired by neuroscience, cognitive architectures, and connectomics research. Rather than training a large neural network, the project investigates whether higher-level cognitive behaviors can emerge from interacting symbolic and reinforcement-based mechanisms operating on a dynamic graph of concepts.

## Current Capabilities

### Goal-Directed Attention
The agent can maintain an active goal and bias action selection toward goal-relevant pathways.

### Reinforcement Learning
State transitions are evaluated through reward signals and stored as Q-values, allowing the system to gradually improve decision-making through experience.

### Semantic Network Navigation
Concepts are represented as interconnected nodes. The agent traverses this graph while balancing reward, uncertainty, curiosity, and learned value.

### Curiosity and Uncertainty Drives
Behavior can be influenced by intrinsic drives that encourage exploration of uncertain or informative regions of the network.

### Predictive Monitoring
The system continuously estimates uncertainty, transition confidence, and prediction quality to support adaptive behavior.

### Self-Learning Transitions
The network can create and reinforce transitions based on experience accumulated during autonomous training.

### Live Cognitive Visualization
A real-time HUD exposes internal state variables such as attention, stress, curiosity, confidence, fatigue, Q-values, and active drives.

## Research Goals

The long-term objective is to investigate whether increasingly complex cognitive structures can emerge through the interaction of:

- Reinforcement learning
- Episodic memory
- Semantic memory
- Schema formation
- Abstraction mechanisms
- Predictive processing
- Goal-directed control

## Current Development Status

The system currently demonstrates stable autonomous goal-directed reinforcement learning and adaptive graph traversal.

Work is ongoing to validate higher-level memory formation, episodic storage, schema extraction, and abstraction mechanisms.

## Disclaimer

MiniFlyWire is an experimental research project and should not be interpreted as artificial general intelligence, consciousness, or human-level cognition. The project is intended as an exploration of cognitive-system design and emergent behavior.


## I would also add a Research Progress section.
### Research Progress

- [x] Semantic graph
- [x] Goal system
- [x] Reinforcement learning
- [x] Curiosity drive
- [x] Prediction system
- [x] Self-learning transitions
- [x] Autonomous training

- [ ] Episodic memory validation
- [ ] Motif extraction
- [ ] Schema formation
- [ ] Hierarchical abstractions
- [ ] Long-horizon planning
- [ ] World-model evaluation
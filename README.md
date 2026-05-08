# Mini FlyWire Brain
### Experimental 3D Reinforcement Learning Cognitive Architecture

An experimental visual artificial brain system inspired by:
- biological neural structures
- reinforcement learning
- dynamic graph systems
- emergent cognition
- FlyWire-style connectomics

Built using:
- JavaScript
- Three.js
- custom reinforcement learning logic

---

# Overview

Mini FlyWire Brain is an experimental AI sandbox designed to explore how simple reinforcement learning systems can evolve into more complex cognitive architectures through:
- state-action learning
- adaptive exploration
- dynamic connection strengthening
- reward-driven behavior
- neuron visualization
- self-modifying path selection

The project focuses on making internal learning processes visible in real time.

Unlike traditional neural network demos, this system emphasizes:
- interpretable learning
- visual cognition
- emergent behaviors
- graph-based intelligence
- interactive neural structures

---

# Core Idea

The system continuously performs:

```text
observe state
→ choose action
→ receive reward
→ update learning
→ strengthen pathways
→ repeat
```

Over time the network begins favoring successful behavioral patterns.

---

# Current Architecture (Before Episodic Goal Memory)

Current architecture includes:

| System | Status |
|---|---|
| Reinforcement Learning | ✅ |
| Q-Learning | ✅ |
| Dynamic Neuron Graph | ✅ |
| Exploration vs Exploitation | ✅ |
| Risk-Based Exploration | ✅ |
| Live 3D Brain Visualization | ✅ |
| Reward Reinforcement | ✅ |
| Connection Strengthening | ✅ |
| Interactive Neuron Inspection | ✅ |
| Emergent Path Selection | ✅ |
| Episodic Goal Memory | ❌ not added yet |

---

# Visual Preview

The project renders:
- neurons as 3D nodes
- connections as dynamic links
- reward activity as visual feedback
- learning evolution in real time

The goal is to make AI learning visually understandable.

---

# Why This Project Exists

Most AI projects hide learning internally.

This project tries to expose:
- how decisions form
- how rewards alter behavior
- how exploration evolves
- how networks stabilize
- how simple systems may grow toward cognition

The architecture is intentionally experimental.

It is closer to:
```text
an evolving artificial nervous system
```

than a traditional static neural network.

---

# Main Concepts

---

## 1. Reinforcement Learning

The agent learns through trial and error.

Basic cycle:

```text
State → Action → Reward
```

Good actions become stronger over time.

---

## 2. Q-Learning

The system stores learned action values:

```javascript
Q[state][action]
```

Higher Q-values indicate better actions.

Core learning equation:

```text
Q(s,a) =
Q(s,a) +
learningRate *
(
reward +
discountFactor * maxFutureQ
-
Q(s,a)
)
```

---

## 3. Exploration vs Exploitation

The agent balances:
- trying new actions
- using known successful actions

Controlled by:

```javascript
epsilon
```

Example:

```javascript
if (Math.random() < epsilon)
```

---

## 4. Risk-Based Exploration

Custom experimental logic:

```text
high reward areas increase future exploration probability
```

This creates:
- adaptive curiosity
- reward-driven risk-taking
- local behavioral expansion

The system becomes more exploratory around successful regions.

---

## 5. Dynamic Neural Graph

The brain is represented as:
- nodes
- edges
- activation flows

Connections can:
- strengthen
- weaken
- activate dynamically

based on learning outcomes.

---

## 6. Emergent Behavior

The system is not manually scripted with behaviors.

Instead:
- behaviors emerge from rewards
- path preference evolves naturally
- successful structures reinforce themselves

---

# Project Structure

```text
MiniFlyWire/
│
├── index.html
├── README.md
```

Current implementation keeps everything inside:

```text
index.html
```

for easier experimentation.

---

# Technology Stack

| Technology | Purpose |
|---|---|
| HTML | Application structure |
| CSS | Visual styling |
| JavaScript | Learning logic |
| Three.js | 3D rendering |

---

# Getting Started

---

## 1. Clone Repository

```bash
git clone https://github.com/yourusername/mini-flywire-brain.git
```

---

## 2. Open Project

Open the folder in:
- VS Code

---

## 3. Install Live Server

Install VS Code extension:

```text
Live Server
```

---

## 4. Run Project

Right click:

```text
index.html
```

Then:

```text
Open with Live Server
```

Browser launches automatically.

---

# High-Level System Flow

```text
┌─────────────┐
│ Observe     │
│ State       │
└─────┬───────┘
      ↓
┌─────────────┐
│ Choose      │
│ Action      │
└─────┬───────┘
      ↓
┌─────────────┐
│ Execute     │
│ Action      │
└─────┬───────┘
      ↓
┌─────────────┐
│ Receive     │
│ Reward      │
└─────┬───────┘
      ↓
┌─────────────┐
│ Update      │
│ Q Values    │
└─────┬───────┘
      ↓
┌─────────────┐
│ Reinforce   │
│ Connections │
└─────┬───────┘
      ↓
┌─────────────┐
│ Render 3D   │
│ Brain       │
└─────────────┘
```

---

# Core Systems

---

## Scene System

Responsible for:
- camera
- renderer
- world space
- animation loop

Main objects:

```javascript
scene
camera
renderer
```

---

## Neuron System

Each neuron contains:
- identity
- state information
- reward influence
- visual representation

Example:

```javascript
const neuron = {
    id: 1,
    reward: 0,
    state: 0
};
```

---

## Connection System

Connections represent:
- information flow
- learned associations
- behavioral preference

Rewarded paths become stronger.

---

## Training Loop

Core iterative learning cycle.

Continuously:
1. observes
2. predicts
3. acts
4. receives feedback
5. updates learning

---

## Prediction Engine

Usually handled inside:

```javascript
runPrediction(stateId)
```

Responsible for:
- selecting actions
- evaluating Q-values
- exploration decisions

---

# Training Procedure

This section explains how the brain is trained.

---

## Step 1 — Launch Simulation

Run the project using Live Server.

The 3D brain initializes:
- neurons
- connections
- state systems

---

## Step 2 — Initialize Learning

The Q-table begins mostly empty:

```javascript
Q = {}
```

Initially the brain has:
```text
almost no knowledge
```

---

## Step 3 — Start Interaction Loop

The simulation repeatedly runs:

```javascript
animate()
```

or:

```javascript
train()
```

---

## Step 4 — Observe Current State

The agent detects:

```javascript
currentState
```

This represents:
- current condition
- neural context
- environmental information

---

## Step 5 — Choose Action

The system decides:

```text
explore
or
exploit
```

using epsilon-greedy logic.

---

## Step 6 — Execute Action

Possible actions may include:
- activating pathways
- selecting neurons
- reinforcing connections
- choosing transitions

---

## Step 7 — Receive Reward

Environment provides feedback.

Example:

| Result | Reward |
|---|---|
| useful behavior | +10 |
| failed behavior | -5 |

---

## Step 8 — Update Learning

Q-values update:

```text
good outcomes strengthen actions
bad outcomes weaken actions
```

---

## Step 9 — Strengthen Connections

Rewarded pathways gain influence.

This gradually creates:
- stable patterns
- preferred routes
- learned behaviors

---

## Step 10 — Adaptive Risk Expansion

Your experimental logic:

```text
high reward increases nearby exploration chance
```

creates:
- curiosity zones
- adaptive exploration
- reward-centered expansion

This is one of the most unique systems in the project.

---

## Step 11 — Repeat Thousands Of Cycles

Learning emerges through repetition.

Over time:
- randomness decreases
- useful pathways dominate
- behavior stabilizes

---

# Signs Training Is Working

Indicators of successful learning:

✅ repeated successful paths  
✅ increasing reward consistency  
✅ stable action preferences  
✅ stronger useful connections  
✅ reduced random wandering  

---

# Recommended Parameters

| Parameter | Suggested Range |
|---|---|
| learningRate | 0.05 – 0.2 |
| discountFactor | 0.8 – 0.99 |
| epsilon | 0.1 – 0.3 |

---

# Current Limitations

Before Episodic Goal Memory:

| Missing Capability | Reason |
|---|---|
| long-term memory | no episodic storage |
| future planning | no sequence modeling |
| persistent goals | no goal memory |
| replay learning | no experience replay |
| temporal reasoning | limited short-term learning |

---

# Future Research Directions

Planned future upgrades:

- episodic memory
- goal hierarchies
- temporal abstraction
- replay buffers
- curiosity engines
- predictive simulation
- self-generated objectives
- dream/replay systems

---

# Research Direction

This project explores a question:

```text
Can increasingly complex cognition emerge from
simple reinforcement mechanisms combined with
dynamic neural structures?
```

The project is intentionally experimental and research-oriented.

---

# Inspiration

Inspired by concepts from:
- reinforcement learning
- connectomics
- emergent systems
- embodied cognition
- biological neural structures

---

# Contributing

This is currently an experimental solo research project.

Future contributions may include:
- optimization
- visualization upgrades
- memory systems
- training environments
- cognitive architectures

---

# Roadmap

## Completed

- [x] Q-learning
- [x] dynamic neuron graph
- [x] 3D visualization
- [x] exploration system
- [x] risk-adaptive behavior
- [x] reward reinforcement

## Next Major Upgrade

- [ ] Episodic Goal Memory

This future system will introduce:
- long-term experience storage
- persistent objectives
- temporal memory chains
- event recall

---

# License

MIT License

---

# Final Notes

Mini FlyWire Brain is not intended as a production AI framework.

It is an experimental cognitive sandbox designed to:
- visualize learning
- study emergent behavior
- prototype brain-inspired systems
- explore artificial cognition architectures

The current architecture represents:
```text
a reinforcement-driven proto-cognitive system
```

before the addition of episodic memory structures.

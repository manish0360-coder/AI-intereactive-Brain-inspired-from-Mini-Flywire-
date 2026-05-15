# Mini FlyWire Brain

A live 3D visualization of a tiny AI brain that learns by itself — built with plain JavaScript and Three.js. No frameworks, no build tools.

Watch the brain think, explore, get stressed, get tired, and slowly learn which paths are good.

---

## Quick Setup

**Option A — Python (recommended, no install needed)**

```bash
git clone https://github.com/yourusername/mini-flywire-brain.git
cd mini-flywire-brain
python3 -m http.server 8080
```

Open `http://localhost:8080` in your browser.

**Option B — VS Code**

1. Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension
2. Right-click `index.html` → **Open with Live Server**

> ⚠️ Must be served over HTTP — opening `index.html` directly as a `file://` URL won't work because the project uses ES modules and fetches JSON files.

---

## What you see on screen

| Thing | What it is |
|---|---|
| Coloured spheres | Concepts the brain knows (`dog`, `food`, `eat` …) |
| Lines between them | Connections — paths the brain can travel |
| **Cyan dot flying** | Brain sending a **thought** from one word to another |
| **Yellow dot flying** | Brain **learning** — moving and updating its memory |
| Background turns red | Brain is stressed |
| Word label turns white | That concept was just activated |

### Sphere colours

| Colour | Category |
|---|---|
| 🟠 Orange | Animal — `dog`, `cat`, `lion`, `tiger` |
| 🟢 Green | Food — `food`, `meat`, `milk`, `bone` |
| 🟡 Yellow | Action — `eat`, `hunt`, `drink` |
| 🔵 Blue/Purple | Place — `forest`, `home`, `human` |

---

## Controls

| Input | What it does |
|---|---|
| **Click** a word | Teach the brain — strengthens that connection |
| **Space** | Start / stop the auto-brain |
| **Shift + Click** | Set a goal — brain tries to reach that word |
| **Hover** a word | See its category and how many connections it has |

---

## The GUI panels

### 🧠 Brain Status (top-right, auto-fades)

Shows the brain's current emotional state as live progress bars:

| Bar | What it means |
|---|---|
| 😰 **Stress** | Brain feels lost or stuck. Rises from uncertainty, falls after success. |
| 🔍 **Curiosity** | Brain wants to try new paths it hasn't visited |
| 💪 **Confidence** | Brain trusts its learned habits |
| 😴 **Tiredness** | Brain has been thinking a lot — recovers slowly |

The big emoji at the top changes with mood: `😎 → 🙂 → 😐 → 😬 → 😰 → 😱`

The **speed slider** controls how fast the brain thinks (100ms = turbo, 2s = slow).

All panels fade out after a few seconds to keep the view clear. Hover over any panel to bring it back.

### 💬 What's happening? (bottom-left, auto-fades)

Shows the last few thoughts as a chain:

```
🦁 lion  →  🥩 meat  →  😋 eat
```

And a plain-English reason for the last decision, e.g.:
- *"Been here before — it was good!"*
- *"Never tried this — let's explore!"*
- *"Brain is very sure about this one."*

---

## How the brain learns

Every tick the brain runs one cycle:

```
Look at current concept
→ Score all possible next concepts
→ Pick the best one (or explore randomly 20% of the time)
→ Send a cyan thought-dot along that path
→ Update memory based on what happened
→ Repeat
```

The score for each candidate path combines:

- **Q-value** — how good was this path historically?
- **Reward memory** — did this path give a reward before?
- **Curiosity** — never tried this? Explore it!
- **Habit** — used this a lot? Trust it more.
- **Semantic meaning** — does `lion → meat` make logical sense?
- **Future planning** — does this path lead toward the goal?
- **Emotional state** — stress, fatigue, and confidence all shift the score

---

## What happens over time

| Stage | Brain behaviour |
|---|---|
| Fresh start | Random wandering, no preferences |
| After a few clicks | Starts favouring the paths you taught |
| After Space (auto mode) | Finds a "safe zone" and exploits it |
| With a goal set | Routes toward the goal word |
| Long run | Stress and tiredness oscillate, curiosity drives occasional exploration |

---

## Project structure

```
mini-flywire/
├── index.html           # entry point (loads Three.js + main.js)
├── main.js              # brain logic, agent loop, all click/key handling
├── neurons.json         # 14 concept nodes with 3D positions
├── connections.json     # 17 edges between concepts
└── render/
    ├── scene.js         # Three.js scene, camera, renderer
    ├── behavior.js      # emotional states (stress, fatigue, curiosity, confidence)
    ├── qlearning.js     # Q-table (state → action → value)
    ├── memory.js        # transitions, rewards, penalties maps
    ├── embeddings.js    # 32-dim semantic meaning vectors per neuron
    ├── planning.js      # look-ahead future path scoring
    ├── replay.js        # episodic memory replay (dream mode)
    ├── scoring.js       # final decision score formula
    ├── hud.js           # brain status panel (right side)
    ├── labels.js        # floating word labels on neurons
    ├── connections.js   # draws edges between neurons
    ├── render.js        # Three.js animation loop
    ├── search.js        # findNeuronById helper
    ├── knowledge.js     # hardcoded semantic relations
    ├── stars.js         # background star field
    └── ui.js            # legacy reasoning box (hidden)
```

---

## Tech stack

| | |
|---|---|
| [Three.js](https://threejs.org) r158 | 3D rendering (loaded from CDN) |
| Vanilla JS ES modules | All brain logic — no bundler needed |
| Python `http.server` | Local dev server |

---

## Roadmap

- [x] Q-learning
- [x] Semantic embeddings
- [x] Episodic replay memory
- [x] Emotional state system (stress, fatigue, curiosity, confidence)
- [x] Interactive GUI — live HUD, thought chain, speed control, tooltips
- [x] Goal-directed navigation (Shift+Click)
- [x] Neuron pulse on activation
- [x] Background stress tinting
- [ ] Episodic goal memory (long-term planning)
- [ ] Novelty reward (anti-exploitation)
- [ ] Sleep/dream replay mode

---

## License

MIT

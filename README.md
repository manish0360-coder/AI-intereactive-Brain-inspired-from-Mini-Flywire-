# Mini FlyWire Brain

A live 3D visualization of a tiny AI brain that learns by itself — built with JavaScript and Three.js.

Watch the brain think, explore, get stressed, get tired, and slowly learn which paths are good.

---

## What it looks like

- **Coloured spheres** = concepts the brain knows (`dog`, `food`, `eat`, `forest` …)
- **Lines between them** = connections (paths the brain can take)
- **Cyan dots flying** = the brain sending a thought from one concept to another
- **Yellow dots flying** = the brain moving and learning from experience
- **Background turns red** = the brain is stressed

---

## Quick Setup

**Option A — Python (no install needed)**

```bash
git clone https://github.com/yourusername/mini-flywire-brain.git
cd mini-flywire-brain
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

**Option B — VS Code Live Server**

1. Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension
2. Right-click `index.html` → **Open with Live Server**

> ⚠️ Must be served over HTTP. Opening `index.html` directly as a file won't work (ES modules + JSON fetch require a server).

---

## Controls

| Action | What it does |
|---|---|
| **Click** a word | Teach the brain — it learns this connection |
| **Space** | Start / stop the auto-brain |
| **Shift + Click** | Set a goal — brain tries to reach that word |
| **Hover** a word | See its category and connections |
| **😱 Stress button** | Inject stress — watch the brain panic |
| **😌 Calm button** | Calm the brain down |
| **Speed slider** | Control how fast the brain thinks |

---

## Colour guide

| Colour | Meaning |
|---|---|
| 🟠 Orange | Animal (`dog`, `cat`, `lion`, `tiger`) |
| 🟢 Green | Food (`food`, `meat`, `milk`, `bone`) |
| 🟡 Yellow | Action (`eat`, `hunt`, `drink`) |
| 🔵 Blue/Purple | Place (`forest`, `home`, `human`) |
| Cyan dot | Thought signal (prediction) |
| Yellow dot | Learning step (agent moving) |

---

## How the brain works

Every 500ms the brain runs one thinking cycle:

```
Look at current concept
→ Score all possible next concepts
→ Pick the best one (or explore randomly)
→ Send a thought-dot along that path
→ Learn from what happened
→ Repeat
```

The score for each path combines:

- **Q-value** — how good this path was in the past
- **Reward memory** — did this path give a reward before?
- **Curiosity** — never tried this? Explore it!
- **Habit** — used this a lot? Trust it more
- **Semantic meaning** — does `lion → meat` make sense?
- **Future planning** — does this path lead toward the goal?
- **Emotional state** — stress, fatigue, and confidence all shift the score

---

## Brain states (HUD top-right)

| State | What it means |
|---|---|
| 😰 **Stress** | Brain feels lost or stuck. Builds from uncertainty. |
| 🔍 **Curiosity** | Brain wants to explore new paths |
| 💪 **Confidence** | Brain trusts its learned habits |
| 😴 **Tiredness** | Brain has been thinking a lot — needs rest |

The big emoji at the top of the HUD shows the overall mood: `😎 → 🙂 → 😐 → 😬 → 😰 → 😱`

---

## Project structure

```
mini-flywire/
├── index.html          # entry point
├── main.js             # brain logic, agent loop, click handling
├── neurons.json        # 14 concept nodes with 3D positions
├── connections.json    # 17 edges between concepts
└── render/
    ├── scene.js        # Three.js scene, camera, renderer
    ├── behavior.js     # emotional states (stress, fatigue, etc.)
    ├── qlearning.js    # Q-table
    ├── memory.js       # transitions, rewards, penalties
    ├── embeddings.js   # semantic meaning vectors
    ├── planning.js     # look-ahead future scoring
    ├── replay.js       # episodic memory replay
    ├── scoring.js      # final decision score formula
    ├── hud.js          # brain status panel
    ├── labels.js       # floating word labels on neurons
    ├── connections.js  # draws edges
    ├── render.js       # animation loop
    └── ...
```

---

## Tech stack

| | |
|---|---|
| Three.js | 3D rendering |
| Vanilla JS (ES modules) | All brain logic |
| No build tools | Just open and run |

---

## What the brain learns over time

1. **Early** — random wandering, no preferences
2. **After a few clicks** — starts favouring taught paths
3. **After Space (auto mode)** — finds a "safe zone" and exploits it
4. **With a goal set** — starts routing toward the goal word

This is real reinforcement learning — no tricks, no pre-trained weights.

---

## Roadmap

- [x] Q-learning
- [x] Semantic embeddings
- [x] Episodic replay memory
- [x] Emotional state system (stress, fatigue, curiosity, confidence)
- [x] Interactive GUI with live brain HUD
- [x] Goal-directed navigation
- [ ] Episodic goal memory (long-term planning)
- [ ] Novelty reward (anti-exploitation)
- [ ] Dream/sleep replay mode

---

## License

MIT

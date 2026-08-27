# Decisions

Project decision log. One entry per ruling. Newest first.

Entries record **decisions and their scope**. They are not specifications, do not
supersede any frozen artifact, and carry no executable effect.

---

## D-001 — M7 goal transport: authorised as a narrow integration bridge

**Date:** 2026-08-23 · **Authority:** Director ruling of 2026-08-23 · **Status:** in force
**Scope:** the M7 experiment only. Frozen artifact untouched — `M7_PREREGISTRATION.md`,
SHA-256 `2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9`.

### 1. Classification

The goal transport is a **narrow integration bridge, not new agent behavior.**
Goal state (`goalNeuronId`), its 54 readers, goal-directed decision behavior
(goal-namespaced Q keys), goal-directed reward behavior, and goal setters all
exist in the committed baseline `HEAD 7c8bdde`, predating M7. The bridge supplies
a value to that pre-existing mechanism and does nothing else.

### 2. Authority for the transported value

The value is `cfg.goal`, i.e. the **already-frozen** schedule `GOALS[configIndex mod 4]`
over `{8, 12, 16, 19}` (frozen §3.7). It is forwarded, never derived, defaulted, or
inferred at any point in the chain.

**No new scientific parameter, threshold, hypothesis, metric, or experimental
condition is introduced.**

### 3. Exact boundary

| Component | Responsibility |
|---|---|
| `experiments/m7/run.js` | forwards `cfg.goal` — sole experiment-level source |
| `experiments/phase1_0/_driver.js` (`boot`) | transports an **explicitly supplied** goal during bootstrap, before `main.js` is imported |
| `main.js` | installs that value into the pre-existing `goalNeuronId`, **after `loadBrain()` and before agent execution** |

### 4. Scope limitation

`globalThis.__M7_GOAL__` is a **one-purpose bootstrap transport for this frozen
experiment only.** It is **not** a general configuration bus, and **not** an
architectural pattern for carrying arbitrary runtime state. Any further use
requires its own ruling.

### 5. Isolation rule

**No goal is installed unless explicitly supplied by the M7 experiment path.**
The vestigial `goal = 16` default in `boot()` is deliberately not transported, so
every existing `boot({ seed })` caller remains behaviorally unchanged.

### 6. Verification basis (as reported, 2026-08-23)

- Boot-only installation consumed **zero RNG**: 641 cognitive / 3020 visual draws
  with no goal, with goal 8, and with goal 19 alike.
- Divergence appears **only after agent execution** — 641 = 641 at boot; 12984 vs
  14680 cognitive draws after 120 ticks, which is pre-existing goal-directed
  behavior being activated.
- **G1 M7-off parity GREEN** after the `main.js` edit: bit-identical across
  10 seeds × 1000 ticks, 0 mismatches, with the anti-vacuity control still firing.
- `verify_goal.js` 26/26; full regression 442 passed, 1 failed — the single
  failure being the pre-existing documented `verify_S3.js` S3.2 result recorded in
  ERR-01a §5, unchanged by this work.
- Independent review (Gemini) classified the seam as a narrow new integration
  bridge, consistent with §1.

### 7. Governance consequence

This decision authorises **the existing seam** as the lawful configuration-to-runtime
bridge for M7 goal installation.

It does **not** authorise any additional production behavior, any further bootstrap
channel, or any extension of `__M7_GOAL__` beyond the boundary in §3. It does not
modify the frozen pre-registration, does not supersede any clause, and is not an
erratum.

# Candidate-Admission Specification

**Status:** FROZEN specification of existing behaviour
**Milestone:** M13
**Date:** 2026-09-09
**Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-09-09 — *M13, candidate-admission specification freeze*

**Binds to source at:** `0f47d7b` (M11 repair) / audited at `d945ce6` (M12)

---

## 0. What this document is, and what it is not

This records **what the candidate-admission substrate is**, so that a future C1 successor
inherits a written parameter set instead of a set of undocumented constants.

It does **not** answer *why the original author chose each number*, except where committed
evidence actually supports an answer. Where rationale is unrecoverable this document says so in
those words and stops. **No plausible-sounding explanation is offered as historical intent.**

It changes no code, repairs nothing, tunes nothing, consumes no seed, computes no statistic, and
makes no cognitive claim.

### Evidence classification used throughout

| Class | Meaning |
|---|---|
| **A — Explicit** | Rationale explicitly stated in committed source or committed documentation |
| **B — Recoverable** | Rationale derivable from committed source/documentation without invention |
| **C — Unrecoverable** | Rationale not recoverable from the committed record |
| **D — Implementation fact** | An observable property of the code, carrying no rationale claim |

Untracked working notes under `research/cognitive-audit/` are **not authoritative** and are never
used as specification. Where cited they are explicitly labelled untracked.

---

## 1. The admission pipeline

For a decision taken at `currentKey` with goal `goalNeuronId`, the candidate pool is built and
filtered inside `runPrediction` as follows.

### 1.1 Pool construction — `main.js:1593–1604`

```js
const allCandidates = new Map();
memoryMap.forEach((value, k) => { allCandidates.set(k, value); });      // transitions.get(currentKey)
startNeuron.userData.neighbors.forEach(id => {
    if (!allCandidates.has(id)) { allCandidates.set(id, 0); }
});
```

`memoryMap` is `transitions.get(currentKey) || new Map()` (`main.js:1510`). The pool is therefore
the union of the learned outgoing transitions from `currentKey` and the graph neighbours of
`currentKey`, with neighbours defaulting to value `0`. **Class D.**

### 1.2 The four admission filters — evaluated in source order

Each is an early `return` inside `allCandidates.forEach` (`main.js:1607`), so **the first
matching filter rejects and later filters never see that candidate.**

| Filter | Location | Condition |
|---|---|---|
| F1 | `main.js:1610` | `penalties.get(currentKey + "->" + k) > 10` |
| F2 | `main.js:1620` | `getQ(makeStateKey(currentKey, goalNeuronId), k) < -0.5` |
| F3 | `main.js:1673` | `!isGraphNeighbor && !isEpisodeTrained && !isHumanTrained` |
| F4 | `main.js:1678` | `goalNeuronId !== null && !canReachGoal(k, goalNeuronId)` |

Surviving candidates are pushed to `choices` at `main.js:2269`.

### 1.3 Decision point, and why ordering matters — **Class D**

```
main.js:2373   const sorted = choices.sort((a, b) => b.weight - a.weight);
main.js:2378   const bestChoice = sorted[0];          <-- the greedy decision
main.js:2410   lastDecision = { ... }
main.js:2423   structureMap.forEach(...)   -> may push MORE into choices
main.js:2453   embeddingMap.forEach(...)   -> may push MORE into choices
main.js:2497   if (choices.length === 0) return;
```

**The greedy decision is fixed at `main.js:2378`, before either secondary loop runs.** Therefore:

- The candidate set determining `bestChoice` is **exactly** pool ∩ (¬F1 ∧ ¬F2 ∧ ¬F3 ∧ ¬F4).
- The secondary loops at `2423` and `2453` enlarge `choices` **after** the decision, for the
  downstream softmax stage only. The structure loop applies its own `canReachGoal` guard but
  **not** F1/F2/F3. The semantic loop returns immediately when `goalNeuronId !== null`
  (`main.js:~2473`), so it is inert during goal-directed operation.
- `bestChoice` is `undefined` exactly when `choices` is empty at line 2373.

A study measuring anything downstream of line 2497 is measuring a **different** candidate set from
one measuring `bestChoice`. This distinction is a specification fact, not an inference.

---

## 2. F1 — penalty filter

**Condition (exact):** `penalties.get(currentKey + "->" + k) > 10` — `main.js:1610`
**Source comment (complete):** `// Block very bad paths`

| Parameter | Value | Location | Class |
|---|---|---|---|
| Threshold | `> 10`, strict | `main.js:1610` | **D** |
| Key construction | string concatenation `currentKey + "->" + k` | `main.js:1610` | **D** |
| Absent-key behaviour | `undefined > 10` is `false` → candidate passes | JS semantics | **D** |

### 2.1 Penalty producers and their caps

| Producer | Location | Increment | Cap | Can exceed 10? |
|---|---|---|---|---|
| Goal-exit penalty | `main.js:1362` | `+8` | **15** | **Yes**, after ≥2 applications |
| 1-hop shortcut block | `main.js:4638` | `+1.5` | **8** | **No** |
| Negative-reward growth | `main.js:4570` | `+0.1` | **5** | **No** |

**Decay:** `main.js:3216` multiplies every penalty by `0.98` per pass and deletes entries below
`0.05`. From the cap of 15, a value remains above 10 for roughly 20 decay passes
(`15 × 0.98ⁿ > 10` ⟹ `n < 20.1`). **Class D.**

### 2.2 Specification status

- **Threshold rationale: Class C — rationale not recoverable from the committed record.**
  The only comment is "Block very bad paths", which states intent but not the value.
- **Two of the three penalty producers are structurally incapable of triggering F1.** This is
  arithmetic over the code's own caps (**Class D**), not a claim that the threshold is wrong.
- **F1 is a heuristic, not a formally specified rule.** No committed document defines it.

> **SPECIFICATION GAP F1-1.** The threshold `10` exceeds the caps of two of the three penalty
> producers. Whether this is intended, vestigial, or a mismatch **cannot be determined from the
> committed record.** Deciding it would require inventing intent, which this milestone forbids.

> **Historical note (non-authoritative).** The untracked working note
> `research/cognitive-audit/04_FALSIFICATION_EVIDENCE.md:134` asserts the penalty cap is "5–8",
> implying F1 can never fire. M12 measurement shows that is incomplete: it omits the cap-15
> producer at `main.js:1362`. Cited as historical evidence only; it is untracked and carries no
> specification authority.

---

## 3. F2 — Q filter

**Condition (exact):** `getQ(makeStateKey(currentKey, goalNeuronId), k) < -0.5` — `main.js:1620`
**Source comment (complete):** `// 🧠 BLOCK DEEPLY NEGATIVE Q PATHS / Q < -0.5 means this path has
been repeatedly bad — don't consider it`

| Parameter | Value | Location | Class |
|---|---|---|---|
| Threshold | `< -0.5`, strict | `main.js:1620` | **D** |
| State key | `Number(pos) + "#" + Number(goal)` | `render/qlearning.js:40–48` | **D** |
| `GOAL_NONE` sentinel | `0`, used when goal is `null`/`undefined` | `render/qlearning.js:38` | **A** — comment states it is the "sentinel for no active goal" |
| Full Q key | `state + "->" + action` (action coerced by concatenation) | `render/qlearning.js:58–66`, `:126–132` | **D** |
| Untrained default | `Q.get(key) \|\| 0` → `0`, which is **not** `< -0.5` | `render/qlearning.js:64` | **D** |
| Q clamp (update) | `Math.max(-20, Math.min(newQ, 20))` | `render/qlearning.js:240–244` | **A** — comment: "SAFE Q LIMIT / prevents runaway intelligence" |
| Q floor (damp path) | `Math.max(-20, dampedQ)` | `render/qlearning.js:335` | **D** |

### 3.1 Specification status

- **Threshold rationale: Class C — rationale not recoverable from the committed record.**
  The comment explains the *intent* ("repeatedly bad") but not the value `-0.5`.
- Reader and writer share one key convention, and both the state and action components are
  type-coerced, so F2 cannot mis-key on candidate identity type. **Class D.**
- Unlike F1, **F2's threshold lies inside its producer's range**: Q is clamped to `[-20, 20]`, so
  values below `-0.5` are attainable. **Class D.**
- **F2 is a heuristic, not a formally specified rule.**

> **SPECIFICATION GAP F2-1.** The threshold `-0.5` has no committed rationale. Its magnitude
> relative to the `[-20, 20]` Q range is an implementation fact, not a justification.

---

## 4. F3 — graph-integrity filter

**Condition (exact):** `!isGraphNeighbor && !isEpisodeTrained && !isHumanTrained` — `main.js:1673`

**Source-stated rule (quoted from the comment at `main.js:1626–1633`):** a candidate is admitted if
it is (1) an actual graph neighbour, OR (2) appears in the trained transitions map with meaningful
strength, OR (3) has reward > 4 from manual training.

**This is the one filter whose intended semantics is explicitly stated in committed source, so it
is auditable against its own rule.** — **Class A.**

| Term | Definition | Location | Class |
|---|---|---|---|
| `isGraphNeighbor` | `structureMap.has(k)` | `main.js:1647` | **D** |
| `structureMap` | built from `startNeuron.userData.neighbors` | `main.js:1521–1523`, `1562` | **D** — so `has(k)` means "k is a neighbour of currentKey"; the name is accurate |
| `trainedStrength` | `transitions.get(currentKey)?.get(k) \|\| 0` | `main.js:1648` | **D** |
| `isEpisodeTrained` | `trainedStrength > 5` | `main.js:1649` | **A** — comment: "transitions strength > 5 is the primary signal", written at `+20*gain` per pass |
| `rewardStrength` | `rewards.get(currentKey + "->" + k) \|\| 0` | `main.js:1667` | **D** |
| `hasEpisodicWitness` | `(adjacencyMemory.get(currentKey + "->" + k) \|\| 0) > 0` | `main.js:1668` | **D** |
| `isHumanTrained` | `rewardStrength > 4 && hasEpisodicWitness` | `main.js:1671` | **A** — comment: "reward > 4 alone is not enough … also need … episodic adjacency evidence" |

### 4.1 Constants

| Constant | Value | Class |
|---|---|---|
| Episode-trained threshold | `> 5` | **A** |
| Human-trained reward threshold | `> 4` | **A** |
| Episodic-witness threshold | `> 0` | **D** |

### 4.2 M12 verification result

The reject condition is the exact De Morgan complement of the stated admit-rule; **all 8
combinations** of (neighbour, episodeTrained, humanTrained) agree. Boundary constants match the
numbers stated in the adjacent comment. **No defect found.**

### 4.3 Rationale that *is* recoverable — Class A

The comment at `main.js:1635–1646` records a prior change: an earlier threshold of `12` sat above
the hard reward cap of `10`, so manually-trained non-graph paths could never qualify; it was
replaced by `transitions strength > 5`. This is committed source and is therefore authoritative
history for F3 — the one place in this document where a numeric choice has a recorded reason.

### 4.4 Type sensitivity — **Class D**

F1 and F2 build keys by string concatenation and are type-safe by construction. **F3 uses two raw
`Map` lookups** — `structureMap.has(k)` and `transitions.get(currentKey).get(k)` — which are
type-sensitive. M12 measured 1825 candidate observations: every candidate key was a `number` and
**0** true graph neighbours were missed. The hazard exists structurally but did not manifest.

---

## 5. F4 — goal-reachability filter (context only; frozen elsewhere)

**Condition (exact):** `goalNeuronId !== null && !canReachGoal(k, goalNeuronId)` — `main.js:1678`

| Parameter | Value | Location | Class |
|---|---|---|---|
| `maxDepth` | `4` (default parameter) | `main.js:1128` | **D** |
| Effective semantics | goal detected iff `dist(k, goal) ≤ 3` | derived from control flow | **B** |
| Visitation | path-local; unmarked on backtrack | `main.js` (M11 repair, `0f47d7b`) | **D** |

Listed for completeness of the admission pipeline. Its correctness was established in M10/M11 and
is not re-opened here. **`maxDepth = 4` rationale: Class C — not recoverable from the committed
record.**

---

## 6. Complete parameter table

| ID | Parameter | Value | Filter | Class | Rationale |
|---|---|---|---|---|---|
| P1 | Penalty rejection threshold | `> 10` | F1 | D | **Not recoverable** |
| P2 | Goal-exit penalty cap | `15` | F1 producer | D | Not recoverable |
| P3 | Goal-exit penalty increment | `+8` | F1 producer | D | Not recoverable |
| P4 | Shortcut penalty cap | `8` | F1 producer | D | Not recoverable |
| P5 | Shortcut penalty increment | `+1.5` | F1 producer | D | Not recoverable |
| P6 | Negative-reward penalty cap | `5` | F1 producer | D | Not recoverable |
| P7 | Negative-reward increment | `+0.1` | F1 producer | D | Not recoverable |
| P8 | Penalty decay factor | `×0.98` per pass | F1 input | D | Not recoverable |
| P9 | Penalty deletion floor | `< 0.05` | F1 input | D | Not recoverable |
| P10 | Q rejection threshold | `< -0.5` | F2 | D | **Not recoverable** |
| P11 | Untrained Q default | `0` | F2 | D | Not recoverable |
| P12 | `GOAL_NONE` sentinel | `0` | F2 | A | Stated: sentinel for no active goal |
| P13 | Q clamp range | `[-20, 20]` | F2 input | A | Stated: "prevents runaway intelligence" |
| P14 | Episode-trained threshold | `> 5` | F3 | A | Stated, with recorded history (§4.3) |
| P15 | Human-trained reward threshold | `> 4` | F3 | A | Stated, with recorded history (§4.3) |
| P16 | Episodic-witness threshold | `> 0` | F3 | D | Not recoverable |
| P17 | `canReachGoal` maxDepth | `4` | F4 | D | **Not recoverable** |

**17 parameters. 4 Class A, 0 Class B (as parameters), 13 Class D.**
**Rationale is not recoverable from the committed record for 13 of 17.**

---

## 7. Remaining specification ambiguity

1. **F1-1** — threshold `10` exceeds two of three producer caps (§2.2).
2. **F2-1** — threshold `-0.5` has no committed rationale (§3.1).
3. **F4-1** — `maxDepth = 4` has no committed rationale; four (node, goal) cells remain
   legitimately unreachable at distance 4 under it.
4. **Ordering** — the secondary loops at `2423`/`2453` mean "the candidate pool" is ambiguous
   unless a study states whether it means the pre-decision set (F1–F4) or the post-decision
   `choices` array. §1.3 resolves this for `bestChoice`; any other measurement must state which it
   uses.

None of these is a demonstrated defect. Each is a gap in the recorded rationale.

---

## 8. C1 BINDING RULE

> **The C1 successor MUST bind every parameter in §6 as a fixed parameter.**
>
> - No silent threshold tuning during C1.
> - No post-hoc threshold optimisation.
> - No changing any value after observing C1 outcomes.
> - A C1 preregistration must cite this document and state that 13 of 17 parameters have no
>   recoverable rationale, so the study is conditioned on constants that are declared, not
>   justified.
> - Any future change to these values requires a **separate** Director-authorised milestone with
>   its own rationale and verification. It may not ride along inside a study.

---

## 9. UQ-B historical status — preserved unchanged

- UQ-B remains **closed**.
- UQ-B raw data, results, registered seed block `897000–897999`, preregistration v1.0 and
  errata ERR-01/02/03 are **unchanged**.
- M9, M10, M11 and M12 recorded results are **unchanged**.
- **UQ-B is not reinterpreted using M12 or this document.** M11 established that pre-repair and
  post-repair substrates produce materially different behaviour, so UQ-B's results describe the
  pre-repair substrate and are not comparable to future measurements on the repaired one. That is
  a scope statement, not a reinterpretation.

---

## 10. What this document does not establish

It makes no claim that planning works, fails, or is beneficial, harmful or inert; none about
cognition or internal representations; and none about whether any parameter value is correct.
It records what the substrate **is**.

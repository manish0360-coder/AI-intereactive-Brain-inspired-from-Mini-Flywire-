# PLANNING / `futureScore` — FORMULATION MEMO

**Status:** DRAFT — formulation only. **NOT a pre-registration. No hypothesis is frozen.**
**Date:** 2026-09-09 · **Authority:** Director ruling of 2026-09-09 authorising the planning
formulation memo, following the mechanism-discriminability audit.
**Purpose:** resolve the D-011 completeness question for this mechanism *before* any freeze.

**Scope.** Read-only audit of committed source. No experiment was run, no liveness pre-check was
performed, no seed was generated or inspected, no sample size was chosen, no production source was
modified, and no implementation was begun. UQ-A is not reopened; D-011 is not revisited.

**Source basis.** `main.js`, `render/planning.js`, `render/scoring.js`, `render/embeddings.js`,
`render/hud.js`, `render/executiveController.js`, `render/memory.js`, `experiments/m7/env.js`,
`connections.json`, `neurons.json` — all at `f6e580f`.

---

## 0. Correction to the selection audit

The mechanism-discriminability audit that selected this target recorded `lookAheadScore` as dead
code on the grounds that it has no call site in `main.js`. **That is wrong.** It has no call site in
`main.js`, but `futureScore` calls it **once per edge of its own DFS** (`planning.js`, inside `dfs`).
`lookAheadScore` is live, it is 144 lines, and §1 below shows it is load-bearing for what this
mechanism actually computes. The rest of that audit's ranking is unaffected — planning remains the
only candidate with a committed external notion of correctness — but the correction changes the
*content* of the hypotheses, so it is recorded here rather than left in a superseded message.

`momentumMemory` remains dead: all three symbols `main.js` imports from it have zero call sites.

---

## 1. Exact cognitive claim — what `futureScore` actually implements

**It is not a planner over a model of the environment.** The name is not evidence, and the source
does not support the name.

### 1.1 What it reads

`futureScore(neuron, goalNeuronId, rewards, penalties, curiosityMap, depth = 3)` performs a
depth-limited backtracking search over the traversal graph. At each edge `currentId -> nextId` it
forms

```
total = reward * 1.5  −  penalty * 2  +  curiosity * 0.4  +  future * 0.8
```

where `reward`, `penalty` and `curiosity` are `Map.get` reads of `rewards`, `penalties` and
`curiosityMap` (`render/memory.js`), and `future = lookAheadScore(nextId, goalNeuronId, 2)`.

**It never reads `Q`. It never reads transition probabilities. It has no access to `p_e` of any
kind.** The environment's reliability structure reaches this mechanism only indirectly, through
whatever `rewards` and `penalties` have accumulated from realised traversals.

### 1.2 The `lookAheadScore` term carries no environmental information

`lookAheadScore(startId, goalId, depth = 2)` returns the **maximum cosine similarity between a node's
embedding and the goal's embedding**, maximised over nodes reachable within `depth` hops
(`planning.js:31-174`; `similarity` is `dot`, `embeddings.js:340-345`, valid as cosine because
vectors are normalised).

The embeddings it compares are created at `main.js:595` by `createEmbedding()`
(`embeddings.js:101-115`): **32 draws of `liveRng()` per node, normalised.** `liveRng()` defaults to
the `cognitive` stream (`instrumentation/rng.js:89-92`). They are i.i.d. random unit vectors drawn at
node-construction time, before any topology, goal or environment assignment is consulted.

**They therefore carry no information about proximity to the goal, graph structure, or edge
reliability.** `lookAheadScore` is a fixed random field over node pairs, entering `futureScore`
weighted at `0.8`.

**A separate and material source fact:** the embeddings constrained by the M7 acceptance criterion
R3 (`|rho(p_e, cos(emb[u], emb[v]))| < 0.10`, `env.js:232-234`) are **`cfg.embedding`, which nothing
installs into the runtime.** `cfg.embedding` is referenced only at `env.js:234`,
`verify_M7.js:271` and `verify_acceptance.js:56` — the acceptance predicate and its verifiers. The
agent uses `userData.embedding` from `createEmbedding()`. R3 constrains a counterfactual embedding
set the agent never sees. The information-free character of `lookAheadScore` therefore does **not**
depend on R3; it follows directly from how the runtime embeddings are drawn.

Because they are drawn at boot from the `cognitive` stream seeded by `agentSeed`, and the exposure
acts only on the decision score computed after boot, **the embedding field is byte-identical in both
arms.** It is a common perturbation, not an arm-dependent one.

### 1.3 Two further source facts about the search

- **`best = deeper * 0.9`** (`planning.js`, inside `dfs`): the branch is entered when
  `deeper > best`, but the value assigned is `deeper * 0.9`. Comparison and assignment use different
  quantities, so `best` can **decrease** when `best < deeper < best / 0.9`. Recorded as observed
  behaviour. **This is not a defect to repair** — production source is not modified — but any claim
  about "deeper lookahead scores higher" must not assume monotonicity.
- **The start node is never added to `visited`.** `visited` is populated only with `nextId` on entry
  and cleared on exit, so a chain may return to the node it started from.

### 1.4 The claim, stated so it can be tested

> `futureScore` implements a **depth-3 backtracking best-edge search over learned associative memory
> (reward, penalty, curiosity), additively perturbed by an information-free embedding-similarity
> field.** Its output is capped at 20 (`main.js:1860-1861`, `Math.min(imaginedFuture * 4, 20)`) and
> enters the decision score as a single scalar.

This is a weaker and more interesting claim than "planning". The scientific question it licenses is
squarely on the North Star: **does search over experience-derived memory improve the application of
knowledge against an external standard of correctness — or does the search machinery merely
redistribute noise?**

---

## 2. Exact causal exposure — the minimum clean intervention

### 2.1 The anchor

`futureBonus` is computed at exactly one place:

```
main.js:1860-1861
  const futureBonus =
  Math.min(imaginedFuture * 4, 20);
```

The identifier occurs in `main.js` exactly twice as this local: the declaration at 1860 and a single
use at 2081, where it is passed into `calculateDecisionScore`. (`main.js:2664` reads the *different*
identifier `liveFutureBonus`; `main.js:5457` is an unrelated literal `0`.) The minimum clean
intervention is therefore **one line**: deliver `0` at 1860-1861 while preserving the
`futureScore(...)` call at 1841 so both arms execute an identical call sequence.

Preserving the call is safe: `futureScore` and `lookAheadScore` perform only `Map.get`,
`findNeuronById` and arithmetic. They write nothing.

`scoring.js:84` already declares `futureBonus = 0` as the parameter default, so `0` is a value the
committed signature was written to accept — the same property that made the UQ-A exposure clean.

### 2.2 The exposure is dual-path by construction, not by choice

From that single anchor, `futureBonus` reaches **both** decision pathways:

| Path | Site | Share |
|---|---|---|
| Learned score | `scoring.js:350` — `['futureBonus', futureBonus * 1.2]` in the terms array → `finalWeight` | 60% |
| Arbitration | `scoring.js:406` — `semanticScore: … + futureBonus * 1.2` → `main.js:2245` `arbitrate(…)` → `executiveController.js:143` | 40% |

blended at `main.js:2253`, `arbitratedScore = finalWeight * 0.60 + competitiveScore * 0.40`.

This is structurally the same shape as UQ-A's E-BOTH — **but it is not a Director choice here.**
There is no single upstream point that reaches one path and not the other, so the both-paths exposure
is the *only* minimum clean intervention. A single-path variant would require intervening inside
`scoring.js` at two separate sites, which is a larger and less clean intervention, not a smaller one.

### 2.3 The HUD / mirror path — RESOLVED: behaviourally inert

`scoring.js:58` declares `export let liveFutureBonus = 0`; `:176` assigns `liveFutureBonus =
futureBonus` on every scoring call. `main.js:426` imports it and `main.js:2664` passes it into
`updateHUD({...})` inside the `if (step === 0)` block.

`render/hud.js` **has no imports at all** and its only external references are
`document.createElement` (`:59, :121, :269, :371`). It writes no shared state, no memory map, and no
global the agent reads. Its `_streamHistory` is module-local and unexported.

**Conclusion: the mirror is a display sink. It is not behaviourally relevant.** Ablating at the
main.js:1860 anchor zeroes the mirror as a side effect, which is correct and requires no separate
decision. No committed instrument records `liveFutureBonus`, so no evidence stream is affected.

**This resolves the exposure question completely. It is not among the open items in §13.**

---

## 3. Depth — is depth 3 exercised?

**Established statically. No diagnostic run is required, and none is requested.**

From `connections.json` and `neurons.json`: **20 nodes, 39 edges, minimum degree 3, maximum degree
6, no isolated nodes** (degree distribution: nine 3s, six 4s, three 5s, two 6s). `main.js:618-640`
builds `userData.neighbors` from the same `connections.json` entries, so the runtime adjacency is the
adjacency in that file.

Simulating `futureScore`'s exact `visited` semantics over that graph — start node not pre-marked,
`nextId` marked on entry and unmarked on exit — a depth-3 chain exists from **all 20 of 20 nodes.**
The recursion is therefore entered to full depth on every call, unconditionally.

**A distinction that matters, and that must not be collapsed:**

- **Structurally exercised — YES, provably, statically.** The depth-3 recursion always runs.
- **Value-determining — UNKNOWN, and data-dependent.** The deeper branch changes the return value
  only when `deeper > best` (§1.3), which depends on the runtime contents of `rewards`, `penalties`
  and `curiosityMap`. No static argument settles it.

The second question is a **liveness** question, not a formulation question, and it is filed in §12.
It must not be answered by a bespoke diagnostic invented now, and it must not be answered on the
registered seed block.

---

## 4. Oracle validity

### 4.1 What each oracle represents

| Oracle | Source | Objective minimised | Depends on |
|---|---|---|---|
| `reliabilityOptimalPolicy(p, goal)` | `env.js:342-356`, via `expectedCostToGoal` (`:325-340`) | **Expected attempts to goal.** Edge weight `1/p_e` is the mean of the geometric number of attempts a slip-prone edge costs. Dijkstra from the goal; policy is `argmin_v (1/p_uv + C(v))`. | topology **and** `p` |
| `hopOptimalPolicy(goal)` | `env.js:357-372` | **Number of edges to goal.** BFS from the goal; policy is `argmin_v dist(v)`. | topology **only** |

They are genuinely independent normative standards: one prices slips, the other ignores them. Both
iterate `orderedNeighbours(u)` and both take the earliest neighbour in `connections.json` order on an
exact tie, so **a disagreement between them is substantive and never a tie-break artefact.**

A third, independent oracle exists as a cross-check: `exhaustiveMinCost` (`env.js:376-388`),
commented *"Deliberately a DIFFERENT algorithm from Dijkstra, so agreement is evidence."*

### 4.2 Are R5 disagreement states sufficient for discrimination?

`checkR5(p, goal)` (`env.js:398-401`) requires `r5DecisionStateDiff(p, goal).count >= 4` — the two
policies must prescribe different actions on **at least four decision states** — and `checkR5` is a
conjunct of the acceptance predicate (`makeConfig`: `cfg.accepted = … && cfg.checks.R5 === true &&
…`). Every accepted configuration is therefore guaranteed non-degenerate for this comparison.

`decisionStates(goal)` is *"a non-goal node with >= 2 traversal neighbours"* (`env.js:320-323`).
Because the minimum degree is 3, **every goal yields exactly 19 decision states** (verified for goals
8, 12, 16, 19). So each configuration offers 19 states, of which ≥4 are guaranteed to be states where
"most reliable" and "shortest" disagree.

**One material limitation, and it is not optional to record.** `evaluateConstraints` opens with
`const p = cfg.pPhase1;` (`env.js:209-210`), under the section header *"R1..R5, evaluated on the
PHASE-I assignment as generated"*. **The ≥4 guarantee holds for phase 1 only.** The acceptance
predicate never examines phase 2. The phase-2 disagreement count is a per-configuration property that
must be **reported as a disclosure**, and it may not be used to include, exclude or weight any
configuration.

---

## 5. Phase handling — RESOLVED

**Neither `pPhase1` nor `pPhase2` globally. The oracle must be evaluated with the `p` in force at the
tick of the decision.**

`env.setTick(t)` sets `PHASE = (t >= T_SHIFT) ? 2 : 1` (`env.js:470`) with `T_SHIFT = 1500` (`:43`),
and `trueP`/`attempt` resolve against the active phase. A run of 3000 ticks therefore spends 1500
ticks under each regime, and a decision taken at tick `t` was taken against `pPhase1` if `t < 1500`
and `pPhase2` otherwise. Evaluating both phases' decisions against one `p` would score half the
observations against an environment that was not in force when the action was chosen.

**The phases are reported separately and are never pooled**, inheriting the UQ-A §10 discipline. Each
observation carries its phase, taken from the recorded tick index.

**A structural asymmetry to record:** the reliability oracle is **time-varying within a run** (it is
a function of `p`), while the hop oracle is **constant** (topology does not change). Any comparison
of P1-type and P2-type alignment must respect that the two standards are not symmetric objects.

---

## 6. Arrival rule — recommended

**First arrival at each decision state, within each phase, per arm.**

Each `(configuration, decision state, phase)` cell contributes at most one observation per arm: the
action executed on the first occasion the agent was at that state in that phase.

**Why this rule and not "every arrival":**

1. **Revisit counts are post-treatment.** The exposure changes the trajectory, so how often an arm
   returns to a state is *caused by the arm*. Weighting observations by visit count would weight the
   comparison by a variable the treatment produces — the mediator error §2 of the UQ-A protocol
   forbids, appearing in a new place.
2. **The rule is defined without reference to either arm's behaviour.** "First arrival" is a property
   of a trajectory, applied identically and independently to each arm.
3. **It bounds the unit of analysis.** One cell, one observation; the configuration remains the unit
   of analysis, per the M7 §C6 discipline that M8, Q1 and UQ-A all inherit.

**The residual, stated rather than hidden.** A state may be arrived at in one arm and not the other,
or in neither. Those cells yield **no comparison** and must be recorded as an explicit category —
`ARMED-only`, `ABLATED-only`, `neither` — and **never imputed**. UQ-A could assign `0` to an unvisited
Q entry because Q is a signed scale with a neutral midpoint (its §8). **There is no neutral action**,
so no analogous imputation is available and none may be invented.

**The consequence for inference, stated plainly.** The comparison set — cells where *both* arms
acted — is selected on a post-treatment event. This has an exact and important structure:

> **Existence claims are immune to this selection. Graded claims are not.**

"Ablation changes the executed action at least once" is refuted or confirmed by an observed flip
regardless of how the comparison set was reached. "The armed arm matches the oracle more often" is a
rate over a treatment-selected set, and its interpretation depends on that selection. This is the
single most important analytical fact in this memo and it drives §9 and §13.

---

## 7. Population — fixed before data, independent of arm

For each accepted configuration:

```
POPULATION = decisionStates(goal) × { phase 1, phase 2 }
           = 19 states × 2 phases
           = 38 cells
```

`decisionStates(goal)` is computed from `connections.json` topology and the configuration's goal
alone. It consults no agent state, no arm, and no outcome. It is identical for both arms by
construction, and it is computable before any run exists.

Both oracles are likewise computed from `(topology, goal, p_phase)` before any run: they are
properties of the environment, not of the agent.

---

## 8. Hypotheses — refined, and each with a real discriminator

Refined from the audit's P0–P3 because §1 changed what the mechanism is. **None is favoured.**

Notation. For a cell where both arms acted and acted **differently** (a *flip*), let `a_A` be the
armed arm's action, `a_B` the ablated arm's action, and let `R(u)` and `H(u)` be the reliability- and
hop-optimal actions at that state under the `p` in force in that phase.

| | Hypothesis | Claim about the flip set |
|---|---|---|
| **P0** | **Inert.** The look-ahead term never changes the executed action. | the flip set is empty |
| **P1** | **Reliability-aligned.** Where it changes the action, it moves toward the expected-attempts optimum. | every flip has `a_A = R(u)` |
| **P2** | **Proximity-aligned.** It moves toward the hop optimum. | every flip has `a_A = H(u)` |
| **P3** | **Anti-normative.** It moves *away* from the expected-attempts optimum. | every flip has `a_B = R(u)` |
| **P4** | **Oracle-unaligned.** It changes actions, but its selections stand in no relation to either standard. | every flip has `a_A ∉ {R(u), H(u)}` and `a_B ∉ {R(u), H(u)}` |

**P1 has a real mechanistic pathway** despite §1 showing the mechanism cannot read `p_e`: a slip
consumes an attempt without producing a traversal, so `rewards` accrues faster on reliable edges.
Reward memory is a noisy integrator of reliability. P1 is not a name-driven hypothesis.

**P2 has a real mechanistic pathway:** the depth-3 search returns high values where reward-bearing
edges lie within three hops, which is a crude proximity signal.

**P4 is necessary, not decorative.** It is precisely what §1.2 predicts: a search whose fourth term
is an information-free random field, weighted at 0.8, may change actions without moving toward any
standard. A hypothesis set that could not express "live but normatively random" would be unable to
report the most mechanistically likely outcome, and that is the failure D-011 exists to prevent.

**No further hypothesis is proposed.** Nothing was added because it sounded interesting.

---

## 9. Discriminator

### 9.1 The observable object

The **flip set**, defined pre-data: cells in the §7 population where both arms acted at first arrival
and executed different actions. Each flip is labelled from the oracles:

```
label_R(flip) ∈ { ARMED, ABLATED, NEITHER }   which arm's action equals R(u)
label_H(flip) ∈ { ARMED, ABLATED, NEITHER }   which arm's action equals H(u)
```

### 9.2 The decisive subset

The **decisive flip set**: flips at R5-disagreement states where `{a_A, a_B} = {R(u), H(u)}`. On a
decisive flip, `R(u) ≠ H(u)` by construction and both arms chose one of them, so `NEITHER` cannot
occur and the flip discriminates P1 from P2 with no residual category. This subset exists because the
acceptance predicate guarantees ≥4 disagreement states per configuration in phase 1 (§4.2).

### 9.3 Strong forms — threshold-free, single-counterexample

Each hypothesis in §8 is a universal claim over the flip set, so each is refuted by **one**
counterexample. No threshold is required, and none is introduced.

| | Refuted by |
|---|---|
| P0 | one flip |
| P1 | one flip with `label_R ≠ ARMED` |
| P2 | one flip with `label_H ≠ ARMED` |
| P3 | one flip with `label_R ≠ ABLATED` |
| P4 | one flip with `label_R ∈ {ARMED, ABLATED}` or `label_H ∈ {ARMED, ABLATED}` |

These forms are **immune to the §6 selection asymmetry**, because they are existence claims.

### 9.4 The graded form — and the honest problem with it

**The strong forms are very likely to be refuted simultaneously.** A mixture of flip labels is the
expected outcome of any mechanism that is live and imperfect. If the study computes only the strong
forms, its terminal report will read:

> *P0 refuted — the mechanism is live. P1, P2, P3, P4 all refuted — the mechanism is mixed.
> Direction: not established.*

**That is UQ-A's terminal state reached by a different route**, and this memo will not pretend
otherwise. Establishing *direction* requires a graded comparison — whether the armed arm matches an
oracle **more often** than the ablated arm — and a graded comparison requires a decision rule.

Two families are available. **This memo does not choose between them and invents no threshold.**

- **(a) Threshold-free graded.** Per configuration, the comparison "armed matched `R` on strictly
  more flips than ablated" is an integer inequality requiring no threshold, with the configuration as
  the unit of analysis. What is still missing is the **study-level** rule that turns those
  per-configuration signs into a verdict — the exact gap UQ-A §11 left open when it licensed the
  per-comparison difference but forbade the aggregate.
- **(b) Thresholded graded.** A pre-data threshold on a stated aggregate. D-011 permits this. It
  would require explicit justification frozen before collection, and it must not be chosen by looking
  at any result. **No such threshold is proposed here.**

Note that a graded comparison, unlike the strong forms, is a rate over a treatment-selected set (§6),
so whichever family is chosen must state how that selection is handled — including the option of
stating plainly that the rate is conditional on both arms having acted, and claiming nothing beyond
that.

---

## 10. Falsification — non-vacuous, and each outcome can genuinely occur

| | A result that would refute it, and why it can occur |
|---|---|
| **P0** | One oracle-labelled flip. Can occur: the term is unconditionally computed on every candidate and enters both decision paths. Cannot be guaranteed: §12's liveness question is open, and an inert verdict is a real possibility this design must be able to return. |
| **P1** | One flip where the armed action is not `R(u)`. Can occur: §1 shows the mechanism cannot read `p_e` and its fourth term is information-free, so misalignment is mechanistically expected. |
| **P2** | One flip where the armed action is not `H(u)`. Can occur: the search maximises memory value, not hop count, and the two coincide only incidentally. |
| **P3** | One flip where the armed action *is* `R(u)`. Can occur: reward memory integrates reliability (§8), giving the armed arm a real pathway to the reliability optimum. |
| **P4** | One flip where either arm's action equals `R(u)` or `H(u)`. Can occur, and on a **decisive** flip it occurs necessarily — which is why P4 must be evaluated on the full flip set, not the decisive subset, where it would be refuted by construction. |

**The last row is a vacuity guard.** Evaluating P4 on the decisive subset would make its falsifier
construction-guaranteed. It is recorded here so that the error cannot be made silently later.

---

## 11. Identifiability — every required observable is collectible today

| Observable | Available from | Precedent |
|---|---|---|
| executed action at a state | Q1's `advance`-site transition record (`fromPos`, `toPos`), the probe at `agentCurrent = next` | Q1 instrumentation, `50be4b4`; collected at `d16d568` |
| tick of the decision → phase | `tickIndex` on the same record | same |
| self-loop exclusion | D-009: a transition is a record with `fromPos !== toPos` | `57229eb` |
| arm label, proven on executed source | UQ-A's ESM load hook plus the loader-thread attestation | `f7cc052` |
| decision-state population | `env.decisionStates(goal)` | committed export |
| `R(u)`, `H(u)` per phase | `env.reliabilityOptimalPolicy(p, goal)`, `env.hopOptimalPolicy(goal)` | committed exports, used by the acceptance predicate |
| `pPhase1`, `pPhase2` | `env.makeConfig(seed, index)` | used by Q1 and UQ-A collection |
| non-degeneracy guarantee | `env.checkR5`, a conjunct of acceptance | `env.js:398-401` |

**Nothing new must be invented, and no new export is required** — which matters, because M7 gate G9
(*"Export surface of every render/ module unchanged … No new export from any cognitive module"*) is
frozen and still binding. The hook-and-transform technique used by UQ-A adds no export.

**Identifiability of the discriminator is confirmed for the strong forms of §9.3.** For the graded
form it is confirmed *as data* — the counts are computable — but the *rule* that turns them into a
verdict does not yet exist, which is §13's open item.

---

## 12. Liveness — the exact questions, to be tested only after a future freeze

**Not run now.** Per UQ-A §14a, the ordering is: freeze the protocol, *then* run the liveness
pre-check, so no liveness result can shape the design.

**L1 — the exposure question (primary, criterion-bearing).**

> Using the committed `benchmarks/harness/decisionProbe.js` over the real `calculateDecisionScore`
> and `arbitrate`, with `futureBonus` at its armed value versus exactly `0`, and an identical
> per-trial RNG stream in both arms: **does ablation ever change which candidate wins?**
> **LIVE** iff the argmax flip rate is strictly greater than zero; **INERT** iff it is exactly zero.
> The influence delta is reported alongside as a mandatory diagnostic, never as the criterion.
> A non-zero delta with a zero flip rate is the cosmetic signature and is classified INERT.

This is UQ-A §14b's criterion applied to this exposure. It is threshold-free and mechanistically
exact: only the winning candidate is executed.

**L2 — the depth question (secondary, diagnostic, non-criterion).**

> Does the depth-3 recursion ever determine `futureScore`'s return value — i.e. is the
> `deeper > best` branch ever taken (§1.3, §3)?

L2 answers what §3 could not settle statically. It is a **diagnostic**, not a gate: an inert-at-depth
mechanism that still passes L1 remains a valid study subject, because the exposure ablates the whole
term. L2 must not be promoted to a criterion, and its result must not alter the exposure.

Both must run on material outside every registered block, consuming no configuration seed of the
future study.

---

## 13. Experiment boundary — what is resolved, and what remains

**Resolved in this memo, from committed source:**

| | |
|---|---|
| what the mechanism computes | §1 — memory-greedy bounded search plus an information-free field; **not** environment-model planning |
| exposure site and minimality | §2.1 — one anchor, `main.js:1860-1861`; call preserved; identifier occurs twice |
| exposure scope | §2.2 — dual-path **by construction**, not a choice; **not** an open decision |
| HUD/mirror relevance | §2.3 — behaviourally inert; **resolved, not open** |
| depth reachability | §3 — depth-3 chains exist from all 20 of 20 nodes; structurally exercised always |
| oracle meaning and independence | §4.1 — expected attempts vs edge count; same tie-break |
| non-degeneracy | §4.2 — ≥4 disagreement states guaranteed, **phase 1 only**; phase 2 is a disclosure |
| phase rule | §5 — the `p` in force at the tick of the decision; phases never pooled |
| arrival rule | §6 — first arrival per state per phase per arm; one-armed cells recorded, never imputed |
| population | §7 — 19 decision states × 2 phases = 38 cells, arm-independent, pre-data |
| hypotheses | §8 — P0–P4, each with a real discriminator |
| strong-form discriminators | §9.3 — threshold-free, single-counterexample, selection-immune |
| falsifiers | §10 — each can genuinely occur; the P4 vacuity trap is guarded |
| identifiability of observables | §11 — all collectible; no new export; G9 respected |
| liveness questions | §12 — L1 criterion-bearing, L2 diagnostic; both post-freeze |

**Not resolved, and deliberately not resolved here:**

1. **The directional decision rule (§9.4).** The one substantive scientific gap.
2. Seed block, minimum evidence, stopping rule — parameters, not formulation; not to be chosen now.
3. The D-011 §7 post-hoc prohibition clause — boilerplate to be written into the pre-registration.

---

## 14. Readiness classification

> ## **B — REQUIRES ONE MORE FORMULATION DECISION**

Not A. Every mechanical and identifiability question is closed, and the strong forms are
threshold-free, falsifiable and selection-immune. But a pre-registration frozen on the strong forms
alone would be **D-011-complete for P0–P4 and silent on direction** — and §9.4 shows the strong forms
are likely to be refuted together, leaving exactly UQ-A's terminal state. Freezing that knowingly
would be the defect D-011 was written to prevent, committed with full advance knowledge.

Not C: every observable is collectible today (§11). Not D: no other candidate has an external notion
of correctness, and the audit's ranking is unchanged by §0's correction.

### The ONE remaining Director decision

> **Does this study pre-register a directional decision rule, and if so which family?**
>
> **(i) Strong forms only.** Freeze P0–P4 as universal claims with threshold-free
> single-counterexample refutation, and **accept in advance, in the frozen text**, that the study can
> establish liveness and refute pure alignment but **cannot establish direction**. Honest, cheap, and
> its limitation is declared before data rather than discovered after.
>
> **(ii) Threshold-free graded (§9.4a).** Add a study-level rule over per-configuration integer
> comparisons that introduces no threshold. Requires the Director to specify what makes a
> per-configuration sign pattern decide the study — the aggregation question UQ-A §11 left open.
>
> **(iii) Thresholded graded (§9.4b).** Permitted by D-011. Requires a threshold justified and frozen
> before collection. **No threshold is proposed in this memo and none may be inferred from it.**

Whichever is chosen must also state how the §6 treatment-dependent selection of the flip set is
handled — including the option of stating plainly that any rate is conditional on both arms having
acted and claiming nothing beyond that.

---

## 15. Recorded, not authorised

**`schemaMemory` remains the highest-priority future candidate.** It is the most North-Star-relevant
mechanism in the repository — it organises episodes into role-slot schemas and applies them to paths
*"even if that specific path was never seen before"* — and it is blocked by a 15-second wall-clock
throttle (`schemaMemory.js:80, :134`), not by science. The repository contains a committed precedent
for exactly the guard that would unblock it: `__M7_REPLAY_ONCE__` (`episodeManager.js:505-514`),
guarded, default-off, introducing *"No wall clock. No tick threshold … No numerical parameter of any
kind."*

**Nothing about `schemaMemory` is modified, authorised or scheduled by this memo.** Whether that
precedent may be extended to its throttle is a production-source question and therefore a Director
decision.

---

## 16. What this memo authorises

**Nothing.** It is a formulation draft. No hypothesis is frozen, no pre-registration exists, no
parameter is selected, no seed is generated or inspected, no production source is modified, no
liveness check has been run, and no implementation has begun.

The next milestone, whatever it is, requires its own authorisation.

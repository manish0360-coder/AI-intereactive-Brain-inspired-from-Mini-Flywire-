# FutureScore V2.3 — Study 2 / OQ-1, Pass 1 (scientific design only)

**Kind:** design gate. **No code, no harness, no seeds, no runs, no commit, no push.**
**Author:** Chief Systems Engineer · **Date:** 2026-09-21
**Frozen baseline:** Study 1 at `a066d47696b1502720f627855c8549f4d2898cd5` (parent `952c9fc`) — not modified.
**Labels:** FACT / INFERENCE / HYPOTHESIS / DESIGN DECISION / OPEN QUESTION.

**Authoritative status carried in unchanged:** V2.3 is not scientifically validated; S3.2′(b) is not claimed
falsified; H1 bounded and inconclusive; H2 unobservable in Study 1; H3 open; OQ-1 unresolved; Study 2 NO-GO
until ruled; OQ-D1 unresolved; no seeds authorized.

---

## Part 1 — Formalising OQ-1

**Variables.**

| Symbol | Definition |
|---|---|
| `G` | geometric goal information: hop distance `d(v,g)` on the physical graph, and the topology it comes from |
| `E` | learned traversal evidence: per-directed-edge `{a, s}` in the boundary record, entering only as `c_hat = (a+1)/(s+1)` |
| `M` | the mechanism mapping (G, E) to a per-candidate score: `FS_H` then the projection |
| `P` | the resulting decision policy (`bestChoice` after the full scoring blend) |
| `Y` | a measurable outcome |

**The imprecise question** "does V2.3 work better" is rejected. Two *separable* questions replace it:

- **OQ-1a (information).** At a fixed decision state with fixed evidence, does `M(G, E)` rank candidates
  **differently and better** — against an external reference — than `M(G, E-neutral)`?
  Formally: is `Δ = Concordance(M(G,E), U*) − Concordance(M(G,E_0), U*)` reliably non-zero and positive,
  where `E_0` neutralises evidence (`c_hat ≡ 1`) and `U*` is the environment's oracle value
  (`−expectedCostToGoal`, validation-only)?
- **OQ-1b (behaviour).** Does the policy difference `P(G,E)` vs `P(G,E_0)` produce a different
  outcome-relevant trajectory statistic?

**DESIGN DECISION.** `P(G,E)` vs `P(G,E_0)` alone is **not** the right primary formulation. Under on-policy
execution the two arms generate *different evidence*, so the comparison confounds "E carries information" with
"E changed which data was collected". OQ-1a is the identifiable question; OQ-1b is secondary and confounded.

**Distinguishing the three cases.**

| Case | Signature |
|---|---|
| **A. geometry-only** | `M(G,E)` and `M(G,E_0)` induce identical candidate rankings at (nearly) every state; `Δ ≈ 0` |
| **B. geometry + evidence** | rankings differ at states where evidence is non-degenerate, and `Δ > 0` against `U*` |
| **C. interaction** | `Δ` depends on geometric configuration — e.g. it appears only where two candidates are geometrically tied, or only where the cheap-by-geometry edge is unreliable. Detected by stratifying `Δ` on geometric tie/margin, not by a single pooled mean |

## Part 2 — Causal structure

```
 seed ──> topology (fixed) ──┬──> d(v,g)  [G] ─────────────┐
                             │                             ├──> FS ──> futureBonus ──┐
 goal (cfg.goal) ────────────┘                             │                          │
                                                           │                          ├──> decision ──> trajectory ──> Y
 policy ──> attempted edge ──> env.attempt (p_e) ──> outcome ──> {a,s} ──> c_hat [E] ─┘        │        │
     ^                                                                                         │        │
     └──────────────────────── FEEDBACK: the policy decides which edges get evidence ──────────┘        │
                                                                                                        │
 other score terms (goalGradientBoost, Q, trust, schema, ...) ──────────────────────────────────────────┘
```

**Confounders and mediators, named explicitly:**

- **Evidence endogeneity (the central confounder).** **FACT:** evidence is written only for edges the policy
  actually attempts (`main.js:4967`). **INFERENCE:** two arms executing different policies therefore observe
  *different* evidence, so any on-policy difference mixes information with data collection.
- **Trajectory divergence.** Study 1 measured first divergence at decision 2–22 with only 2.7–7.2% of positions
  identical. **INFERENCE:** after a few steps the arms are in different states, so per-tick comparisons compare
  different situations.
- **`goalGradientBoost` is a parallel G path.** **FACT:** `main.js:1975-1980` computes a distance-based bonus
  weighted ×2.0 (`scoring.js:352`), and it uses `goalDistance`, which augments topology with learned
  `transitions`. **INFERENCE:** geometry reaches the decision through a second, partly-learned channel that is
  *not* controlled by neutralising `E`.
- **Goal arrivals/resets** relocate the agent to a random node (`main.js:4744`), resetting state and episode.
- **Candidate admission** prunes by `canReachGoal(maxDepth=4)` before FS is computed (P-2 limitation).
- **Goal-entering edges never accumulate evidence.** **FACT** (FS-LN-01 §3.1): the traversal into the goal takes
  no environment draw and no credit, so the final hop always costs the prior `c_hat = 1`.
- **Repeated attempts** on a slip leave the agent in place, generating multiple evidence events on the same edge.
- **Non-stationarity:** `T_SHIFT = 1500` changes `p` mid-run (`env.js:43`), so evidence can become stale.

**INFERENCE:** comparing end-of-run stale rates (or any pooled trajectory statistic) across arms **does not
identify the mechanism**, because divergence, evidence endogeneity, resets and the parallel G path all differ
simultaneously.

## Part 3 — Environment requirements vs the existing M7 substrate

| # | Requirement | M7 status | Evidence |
|---|---|---|---|
| 1 | active goal | **satisfied** | `run.js:212` boots with `goal: cfg.goal`; `GOALS = [8,12,16,19]` (`env.js:38`) |
| 2 | real traversal attempts | **satisfied** | `env.attempt` Bernoulli draw at `main.js:4922-4928` |
| 3 | success **and** failure | **satisfied** | 13 unreliable edges with `p ∈ [0.25,0.45]`; reliable `p ∈ [0.90,1.00]` (`env.js:39-41`) |
| 4 | persistent learned evidence | **satisfied** | the boundary writer is unguarded by M7 (`main.js:4967`), so `{a,s}` accumulate with real outcomes |
| 5 | repeated exposure to learned edges | **plausible, unverified** | `RUN_TICKS = 3000`, `EPISODE_CAP = 150` — but per-edge visit counts are **not yet measured** |
| 6 | alternative paths to the goal | **satisfied** | 20 nodes / 39 undirected edges, D = 4, graph connected |
| 7 | geometric and learned rankings must differ | **UNVERIFIED — this is the pivotal feasibility question** | requires comparing `reliabilityOptimalPolicy(p,goal)` with the hop-distance-optimal policy; not measured |
| 8 | deterministic replay from a registered seed | **satisfied** | `runOnce` + `makeConfig(configSeed, configIndex)`; M39/M40 demonstrated reproducible replay |
| 9 | inspectable provenance | **satisfied** | `evaluatedSeeds()`, config census, M40 evidence pattern |
| 10 | controlled stochasticity | **satisfied** | `liveRng('environment')` draw per attempt; `T_SHIFT = 1500` adds a regime change |

**INFERENCE:** M7 is the correct substrate and **no replacement is needed**. **OPEN QUESTION (Feasibility
Gate F-1):** requirements 5 and 7 are unverified. If, on the accepted configurations, the geometric-shortest
policy already coincides with the reliability-optimal policy, then `E` **cannot** add decision-relevant
information in this environment and Study 2 is not worth running. **This must be checked analytically from the
config's `p` vector — no agent run required — before Pass 2.**

## Part 4 — Failure semantics, traced to code

| Term | Definition in the current system | Source |
|---|---|---|
| **attempt** | one `env.attempt(u,v)` draw at the movement decision; exactly one per movement | `main.js:4922-4928`, `env.js:485-494` |
| **success** | the draw returned true; the agent moves | `main.js:4929` |
| **failure (slip)** | the draw returned false; the agent **remains at u** and the tick is consumed | `env.js` §3.3 semantics |
| **edge evidence** | `a += 1` on every recorded event, `s += 1` only when the outcome was literally `true` | `render/traversalRecord.js` |
| **repeated evidence** | a slip leaves the agent in place, so the same edge can be attempted again next tick | **FACT** |
| **goal arrival** | intended arrival at `goalNeuronId`; the episode is sealed and the agent is relocated | `main.js:4436`, `4744` |
| **episode termination** | goal arrival, or `EPISODE_CAP = 150` ticks | `env.js:44`, frozen §3.7 |

**The critical distinction, as required:**
- *"The agent chose a bad edge"* is a **policy** event. It must **not** update learned traversal evidence.
- *"The environment produced a failed traversal outcome"* is an **environment** event, and it is the only thing
  that updates `{a,s}`.
- **FACT:** the implementation already enforces this — the sole writer sits after `env.attempt` and passes the
  environment's verdict, never a judgement about choice quality.
- **FACT (asymmetry to carry into the design):** traversals into the goal take no draw and write no evidence,
  so the last hop is permanently at the prior.

## Part 5 — Experimental arms

| Arm | Description | The causal question it answers |
|---|---|---|
| **B-FULL** | V2.3 as shipped under M7 | the on-policy behaviour of `M(G,E)` |
| **B-GEO** | V2.3 under M7 with `c_hat` forced to 1 via the existing loader-hook technique | on-policy behaviour of `M(G,E_0)`; **identical in construction to Study 1's A-GEO but no longer a null**, because evidence is now non-degenerate |
| **S-SHADOW** | *one* behaviour policy generates the trajectory and the evidence; **both** `M(G,E)` and `M(G,E_0)` are scored at every decision state **without executing either** | **the primary arm for OQ-1a.** It holds state, candidate set and evidence identical, so the only difference is whether `c_hat` is consulted |

**Rejected:** a separate "learned-evidence neutralisation" arm distinct from B-GEO — under V2.3 neutralising
evidence *is* `c_hat ≡ 1`, so it would duplicate B-GEO (Study 1 §4 already demonstrated the equivalence).
**Rejected:** a pre-V2.3 arm — the old mechanism read rewards/penalties/curiosity and answers a different
question; Study 1 already characterised it.

**DESIGN DECISION:** B-FULL and B-GEO answer OQ-1b and are **secondary and confounded**. S-SHADOW answers
OQ-1a and is **primary**.

## Part 6 — OQ-D1, the same-state counterfactual

**Design A (trajectory-level only).** Cheap; reuses Study 1 machinery. **Resolves:** whether behaviour differs.
**Cannot resolve:** *why*, because divergence, evidence endogeneity, resets and candidate admission all move
together. Study 1 already showed how quickly trajectories separate.

**Design B (same-state counterfactual / shadow).** Both mechanisms are evaluated on identical
(state, candidate set, evidence) inputs and neither decision is executed. **Resolves:** the information
question — whether consulting `E` changes the ranking, and whether the change agrees with the oracle.
**Removes:** trajectory divergence, evidence endogeneity, reset differences, candidate-admission differences.
**Cannot resolve:** whether a ranking change survives the full scoring blend into `bestChoice`, and whether it
improves any behavioural outcome. It is an information claim, not a behavioural one.

**DESIGN DECISION (recommendation):** **Design B is required as the primary gate for OQ-1, not optional.**
Without it, a positive on-policy difference is not attributable to learned evidence, and Part 8 shows the
attribution cannot be rescued after the fact. Design A is retained as a **secondary, explicitly confounded**
observation. **This is a recommendation; OQ-D1 remains the Director's decision.**

## Part 7 — Primary endpoint

**Primary (OQ-1a): oracle-concordance gain.** At each evaluated decision state `k`, with the admitted candidate
set fixed, compute the candidate ranking under `M(G,E)` and under `M(G,E_0)`, and score each against the
oracle ordering induced by `U*(v) = −expectedCostToGoal(p, g)` (validation-only; **never** an input).

```
Δ(state) = τ( rank_FULL , rank_ORACLE ) − τ( rank_GEO , rank_ORACLE )
```

with `τ` a rank-concordance statistic over the admitted candidates. **Primary endpoint = the distribution of
`Δ` over decision states**, reported with its sign pattern, not merely its mean.

**Why this and not the alternatives:**

| Candidate endpoint | Verdict |
|---|---|
| stale rate | **rejected** — Study 1 showed it is a policy-dependent ratio of two independently movable counters, and it is not an OQ-1 quantity |
| goal-reaching efficiency | **secondary** — outcome-relevant but confounded by divergence; low power at run level |
| regret vs oracle policy | **secondary** — meaningful, but on-policy and therefore confounded |
| prediction of future traversal success | **rejected as primary** — requires post-decision outcomes, inviting leakage (Part 8) |
| edge-cost ordering (`c_hat` vs `1/p`) | **supporting diagnostic** — measures whether the estimator learns, not whether it changes decisions |
| ranking / selected-edge change | **necessary but insufficient alone** — a ranking change with no oracle agreement is not "information", so it is reported as a *precondition* (`ranking-change rate`) alongside `Δ` |

**DESIGN DECISION:** report `ranking-change rate` and `Δ` together. A high change rate with `Δ ≈ 0` is the
"changes ranking but not usefully" falsification case (Part 11).

## Part 8 — Identifiability

**The question:** if B-FULL and B-GEO behave differently, how do we know `E` caused it?

| Path that could produce a difference without E carrying information | Control |
|---|---|
| **trajectory divergence** — different states, not better decisions | S-SHADOW fixes the state |
| **evidence endogeneity** — arms collect different data | S-SHADOW fixes the evidence stream (one behaviour policy) |
| **`goalGradientBoost`** — a second, partly-learned geometric channel (`goalDistance` includes `transitions`) | S-SHADOW compares FS rankings **before** the blend, so this term is held identical by construction |
| **candidate admission** (`maxDepth = 4`) | identical admitted set per state in S-SHADOW |
| **goal resets** relocating the agent | no execution in S-SHADOW, so no reset asymmetry |
| **exploration / ε-draws and other RNG** | no execution in S-SHADOW; the behaviour policy is shared |
| **evidence accumulation differences over time** | evaluate at matched ticks along one trajectory |
| **stochastic failure realisation** | shared, single realisation |

**INFERENCE:** OQ-1a is identifiable **only** in the shadow design. **OQ-1b is not cleanly identifiable with the
current system**, and I will not pretend otherwise: to attribute a behavioural difference to `E` one would need
either many independent runs with the confounds balanced, or an interventional design that holds the evidence
stream fixed while executing — the latter is impossible, because executing changes the evidence.

**Honest statement:** the strongest defensible claim available from Study 2 is about **decision information**,
not about behavioural superiority. **OPEN QUESTION:** whether the Director considers an information-level result
sufficient for OQ-1, or wants OQ-1b pursued with its confounding stated.

## Part 9 — Seed governance

**FACT:** the registered namespaces are C1 `895xxx`, UQ-B `897xxx`, held-out `≥ 900500`; the only development
fixtures are `896066:0`, `896066:1`, `896238:2`, `896329:3`.

- **Why Study 1's six seeds cannot be reused:** they are agent seeds for the goal-less phase1_0 driver, not M7
  configuration seeds; they carry no `p` vector, no goal and no acceptance screening. They are also declared
  non-naive. **They are simply not the same kind of object.**
- **Pilot:** the four development fixtures are the appropriate vehicle for the feasibility gate F-1 and for a
  shakedown of the shadow harness. **They must not carry a confirmatory claim.**
- **Confirmatory:** a **fresh registered range** is required. **OPEN — not chosen here.** Selecting a range is a
  governance act reserved for the Director.
- **How many:** because each run is deterministic given (config seed, agent seed), repeated runs of the same
  pair are redundant. The replication unit for OQ-1a is the **decision state**, of which one run yields many, so
  seed count governs *environment* variation rather than measurement noise. A defensible structure is a modest
  number of configurations spanning the four goals, with the count pre-registered before generation. **Naming a
  number here would be invention; it must follow F-1, which determines how often geometry and reliability
  disagree at all.**
- **Paired seeds:** yes — every arm must see the identical configuration and agent seed. Pairing is what makes
  the contrast meaningful.
- **Pre-registration required before any seed is generated:** the endpoint (`Δ`), the concordance statistic, the
  state-inclusion rule, the stratification variable, the stopping rule, the falsification table, and the
  analysis script hash.

## Part 10 — Statistical plan

- **Unit of replication.** Primary: the **decision state** within a run — but states within a run are **not
  independent** (shared trajectory and evidence). **DESIGN DECISION:** treat the **run (config × goal)** as the
  independent unit and summarise `Δ` within a run first (median over its states); report the state-level
  distribution as description only. Ignoring this nesting would be the easiest way to manufacture false
  confidence.
- **Primary contrast:** within-state paired `Δ` (FULL − GEO), summarised per run, then across runs.
- **Secondary:** ranking-change rate; `c_hat`-vs-`1/p` ordering; on-policy B-FULL vs B-GEO outcome statistics,
  all labelled confounded.
- **Effect measure:** median paired `Δ` with an exact/enumerated bootstrap interval, plus the full sign pattern.
- **Mixed signs:** reported as such. Study 1 demonstrated a median that moved while the sign pattern was 3–3;
  that experience is why the sign pattern is a required output, not an appendix.
- **Multiplicity:** one primary endpoint. Secondaries are descriptive and uncorrected, and labelled so.
- **No α threshold is invented.** With a small number of runs, state "consistent with", "inconclusive", or
  "inconsistent with" against the pre-registered falsification table.
- **Stopping:** the pre-registered run set completes; no seed is added to rescue an inconclusive result.
- **Inconclusive** is defined in advance as: interval spanning zero **and** a sign pattern without a majority.

## Part 11 — Falsification

Study 2 must be able to show the learned-evidence hypothesis **wrong**. It is falsified or undermined if:

1. **`c_hat` stays degenerate** — evidence never becomes non-trivial (few repeat visits, or failures confined to
   edges never on candidate paths). *This is checked first; if it holds, the study reports "no test was possible".*
2. **F-1 fails** — geometry-optimal and reliability-optimal policies coincide on the accepted configurations, so
   `E` has nothing to add **in this environment**.
3. **`Δ ≈ 0`** with a high ranking-change rate — evidence changes rankings but not in agreement with the oracle.
4. **`Δ ≈ 0`** with a near-zero ranking-change rate — evidence is consulted but never changes the ordering
   (e.g. `c_hat` differences are swamped by the `−d` terminal).
5. **Differences vanish under state matching** — an on-policy difference exists but the shadow contrast is null,
   indicating divergence rather than information.
6. **Failures occur but do not propagate** — evidence updates, yet the goal-entering exclusion or admission
   pruning prevents it from reaching decisions.
7. **The apparent effect tracks goal resets or admission changes** rather than evidence.

**INFERENCE:** outcomes 1, 2 and 4 are genuinely plausible given the structure — the final hop is permanently at
the prior, the terminal `−d` term is integer-scaled while `c_hat` differences are fractions below ~4, and
`H = 3` bounds how much evidence can accumulate along a scored path. **This design can fail.**

## Part 12 — Reuse / prior art (internal)

| Component | Decision | Justification |
|---|---|---|
| `experiments/m7/run.js` `runOnce` (env, credit, arms, goal wiring) | **REUSE** | the only substrate with an active goal, real failures and registered configs |
| `experiments/m7/env.js` (`makeConfig`, `attempt`, `decisionStates`, `expectedCostToGoal`, `reliabilityOptimalPolicy`) | **REUSE** | oracle is validation-only and already frozen as such |
| M39 shadow-evaluation formulation and pool instrumentation | **ADAPT** | M39 already defined "score candidates without executing"; its RED result was about the *old* mechanism's saturation, not the method |
| M40 temporal/state-census machinery and evidence/provenance layout | **ADAPT** | per-state readouts, integrity files, replay discipline |
| `experiments/fsbehav` hooks (`hook_geo.mjs`) | **REUSE** | exactly the evidence-neutralisation technique needed for the GEO condition |
| `experiments/fsbehav/run.mjs`, `drive.mjs`, `analyze.mjs` | **ADAPT** | no-goal phase1_0 runner; the M7 path differs |
| `verify_S3prime.js`, `_runonce.js`, any phase1_0 gate | **DO NOT USE** | historical, goal-less, and frozen |
| External statistics packages | **DO NOT USE** | exact enumeration sufficed in Study 1; no dependency is justified |

**FACT worth recording:** M40-P1's no-go was caused by projection saturation (372/372 candidates at the cap of
20). **INFERENCE:** V2.3 removed that cap, so the M39/M40 rankability obstacle may no longer apply — which is
what makes a shadow study viable now. This must be **verified**, not assumed.

## Part 13 — Threats to validity

1. **jsdom/driver fidelity** — same as every prior study.
2. **Stochastic failure realisation** — one realisation per seed; shared across arms in shadow, so it cancels
   for `Δ` but limits generalisation.
3. **Topology** — a single 20-node graph; results may not generalise to other graphs (M35/M37 scale work is
   separate).
4. **Geometry–evidence correlation** — if unreliable edges happen to be geometrically unattractive, `E` adds
   nothing detectable; F-1 must quantify this.
5. **Insufficient repeated exposure** — with `H = 3` and admission pruning, scored paths may rarely include the
   edges that carry evidence.
6. **State divergence** — handled in shadow, fatal in on-policy.
7. **Goal resets and `EPISODE_CAP`** — truncate evidence accumulation.
8. **Candidate pruning** (`maxDepth = 4`) — removes exactly the distant states where planning would matter most.
9. **Exploration policy / ε** — affects which edges gain evidence.
10. **Horizon `H = 3`** — frozen; bounds the accumulation of `c_hat` along a path.
11. **Seed selection** — configs are accepted by `evaluateConstraints`; acceptance may itself correlate with
    geometry/reliability structure.
12. **Regression to the mean** — pilot fixtures are not naive.
13. **Measurement leakage** — the oracle must be read **only** in analysis; if any oracle quantity reached the
    scored mechanism the study would be circular. A static gate must assert this.
14. **Post-hoc arm tuning** — forbidden; arms and endpoint are pre-registered before seed generation.
15. **Non-stationarity at `T_SHIFT = 1500`** — evidence learned before the shift is wrong after it; whether to
    evaluate pre-shift, post-shift or both must be pre-registered.

## Part 14 — Package for independent adversarial review (Gemini)

**Instruction to the reviewer: attack this design. Do not approve it.**

1. **Question.** Does V2.3 learned traversal evidence (`c_hat`, from post-outcome per-edge `{a,s}`) add
   decision-relevant information beyond geometric goal distance `−d`?
2. **Causal model.** Part 2, including evidence endogeneity (the policy chooses which edges get data), a
   parallel geometric channel through `goalGradientBoost`/`goalDistance` (which itself includes learned
   `transitions`), candidate pruning at `maxDepth = 4`, goal-entering edges that never receive evidence, and a
   regime change at `T_SHIFT = 1500`.
3. **Environment.** M7: 20 nodes, 39 edges, D = 4, 13 unreliable edges `p ∈ [0.25,0.45]` vs reliable
   `p ∈ [0.90,1.00]`, goals {8,12,16,19}, 3000 ticks, episode cap 150, deterministic replay per registered seed.
4. **Arms.** S-SHADOW (primary): one behaviour policy; both `M(G,E)` and `M(G,E_0)` scored at identical states
   with identical evidence, nothing executed. B-FULL / B-GEO (secondary, confounded): on-policy execution.
5. **Primary endpoint.** `Δ = τ(rank_FULL, rank_ORACLE) − τ(rank_GEO, rank_ORACLE)` per decision state,
   summarised per run; oracle `−expectedCostToGoal` is validation-only. Reported with the ranking-change rate.
6. **Same-state counterfactual (OQ-D1).** Recommended as a **required** primary gate, with the reasoning in
   Part 6 and Part 8.
7. **Seeds.** Development fixtures for feasibility and shakedown only; a fresh registered range, pre-registered,
   for any confirmatory claim. Range not chosen.
8. **Falsification.** Part 11, items 1–7.

**Two questions the reviewer is specifically asked:**
- *"What alternative explanation could produce the same observed result without learned traversal evidence
  contributing information beyond geometry?"*
- *"What control is missing that would make this experiment scientifically non-identifiable?"*

**No recommendation from the reviewer will be adopted automatically.**

## Part 15 — Final recommendation

**CONDITIONAL GO** for Study 2 Pass 2.

Gates that must be resolved **before** any implementation:

| Gate | What must happen |
|---|---|
| **F-1 feasibility (blocking)** | Show analytically, from accepted configurations' `p` vectors, that the reliability-optimal policy differs from the geometric-shortest policy often enough for `E` to matter. Requires no agent run. If it fails, Study 2 is **NO-GO** and the honest finding is "this environment cannot test OQ-1". |
| **F-2 rankability (blocking)** | Confirm that V2.3 raw FutureScore is non-degenerate across candidates at decision states — the property whose absence caused M40-P1's no-go under the old cap. |
| **OQ-D1 ruling** | Director decision on whether the same-state counterfactual is the required primary gate, as recommended. |
| **OQ-1b scope ruling** | Director decision on whether an information-level result satisfies OQ-1, given that the behavioural question is **not cleanly identifiable** (Part 8). |
| **Seed authorization** | Fresh registered range and count, after F-1; pre-registration of endpoint, statistic, inclusion rule, stratification, stopping rule and analysis hash **before** generation. |
| **Anti-leakage gate** | Static proof that no oracle quantity reaches the scored mechanism, only the analysis. |
| **T_SHIFT policy** | Pre-register whether evaluation is pre-shift, post-shift, or stratified by phase. |

**This design can fail**, and the most likely failure modes are F-1 and falsification item 4 — not a null that
could be argued away. No part of it is arranged to demonstrate that V2.3 works.

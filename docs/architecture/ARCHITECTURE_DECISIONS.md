# Architecture Decisions

Engineering decision records for the target architecture ([`COGNITIVE_ARCHITECTURE.md`](COGNITIVE_ARCHITECTURE.md)).
They continue the CD-series in [`docs/COGNITIVE_DECISIONS.md`](../COGNITIVE_DECISIONS.md) and, like it, are **not**
Director rulings: rulings stay in `research/09_decisions.md`. A later record may supersede an earlier one;
superseded records stay in place.

Evidence grades used below: **1** established knowledge · **2** strong empirical evidence · **3** emerging
research · **4** plausible engineering inference · **5** unverified hypothesis · **6** speculative.

---

### AD-1 — The architecture is built in `cognitive/`; the browser app becomes its visualiser

- **Context.** The legacy agent reads the true map and computes its own reward. Its own audit and four later
  studies found no evidence that it learns hidden structure (M7 G15 FAIL; LEARN-0 inconclusive with the interval
  below zero; H1-R and ACQ-1 void). See [`RESEARCH_EVIDENCE_LEDGER.md`](../research/RESEARCH_EVIDENCE_LEDGER.md).
- **Decision.** All new mechanisms are built and tested behind the testbed's environment–agent boundary. The app
  is changed last, to display the validated agent (roadmap M8).
- **Alternatives.** Repair the legacy scorer in place: rejected, because a repaired term still cannot be
  distinguished from privileged knowledge. Rewrite the app first: rejected, nothing validated to show yet.
- **Grade.** 4. **Falsifier.** The legacy agent, run on the battery with equal information (H-LEG), matches or
  beats the testbed planner.

### AD-2 — Two complete controllers and reliability arbitration, not an executive over one scorer

- **Context.** The legacy "executive controller" changed 0 of 6,908 decisions. The architectures whose control has
  measurable support give the controller a choice between alternatives with different error profiles
  ([`COGNITIVE_ARCHITECTURE_COMPARISON.md`](../research/COGNITIVE_ARCHITECTURE_COMPARISON.md) §3).
- **Decision.** A model-based planner and a model-free habit learner run side by side. A monitor tracks the
  reliability of each; one selector picks the controller and logs it.
- **Alternatives.** Global-workspace broadcast (no small-agent evidence); production rules (their evidence rests
  on hand-written task knowledge, which here would be an oracle leak); full expected-value-of-control optimisation
  (not distinguishable from a threshold rule at this scale).
- **Grade.** 2 for the arbitration literature in humans and animals; 4 for its benefit in this agent.
  **Falsifier.** H-ARB: arbitration is no better than switching at random at the same rate, or the controller
  never switches.

### AD-3 — Calibrated belief first

- **Context.** CF-03 failed calibration. Every planned consumer of probabilities (arbitration, planning on demand,
  confidence) needs them to mean what they say.
- **Decision.** Repair the model before building consumers. Done: CF-03b PASS, ECE 0.028 against 0.05.
- **Honest limit.** Calibration did not change task performance. Its value is a prediction about CF-04.
- **Grade.** 2 (measured here). **Falsifier.** H-ARB run with the v1 model does as well as with v2.

### AD-4 — Tasks before stores

- **Context.** In a stationary, fully observed world the model's counts are sufficient statistics, so every other
  memory is redundant with them ([`MEMORY_SYSTEMS_RESEARCH.md`](../research/MEMORY_SYSTEMS_RESEARCH.md) §1). The
  legacy system built six stores first and found one gating side effect.
- **Decision.** A memory mechanism is built only after a task has been admitted on which the current agent fails.
  Order: hidden change with recurrence, cue T-maze with delays, aliased graph.
- **Grade.** 1 for the sufficiency argument; 4 for the ordering. **Falsifier.** A memory mechanism improves return
  on a task the model-only agent already solves.

### AD-5 — Four stores, one owner each

- **Decision.** Context-indexed world model; working-memory slot; episodic ring; planner cache. No other state.
  Not built: successor-representation store, associative memory module, separate semantic / schema / trust /
  emotion stores, replay as a separate system.
- **Grade.** 4. **Falsifier.** Any rejected store beats the four-store agent on an admitted task.

### AD-6 — Internal signals modulate control and never add to the action score

- **Context.** The legacy agent adds drives, emotions and attention to the score; measured effects were zero or
  marginal. The theories those ideas come from place them as modulators of control parameters.
- **Decision.** Modulators set the exploration scale, the arbitration threshold and the planning trigger. Each can
  be clamped, so its contribution is one ablation.
- **Grade.** 3 for the neuromodulation accounts; 4 here. **Falsifier.** H-MOD: clamping a modulator changes nothing.

### AD-7 — A node is a place; cognitive functions are modules

- **Context.** The legacy graph labels places with the names of cognitive functions, which invites the reading
  that the graph is the mind. It is a maze.
- **Decision.** Nodes are environment states. The architecture's functions are modules. The 20-node graph is kept
  as one reference world and as the app's visual identity. Worlds are generated in families and grow in size.
- **Grade.** 1 (a matter of definition). **Consequence.** Public descriptions should stop implying that the graph
  is a brain; the README already says the project is not affiliated with FlyWire and uses no connectome data.

### AD-8 — Event-triggered planning is the resource-aware mechanism

- **Decision.** Plan on surprise, goal change or a tie in habit values; otherwise reuse the cached plan. Report
  backups per decision.
- **Honest limit.** At 24 nodes planning every step costs milliseconds, and CF-03 showed one sweep per decision
  does almost as well. The benefit can only show as equal return at fewer backups, or in larger worlds.
- **Grade.** 4. **Falsifier.** H-EVT: fewer than the pre-stated share of backups saved, or return lost beyond the
  margin.

### AD-9 — What is rejected at this scale

Deep and latent world models (Dreamer, MuZero), deep RL, graph neural networks, contrastive representation
learning, spiking or neural substrates, Monte-Carlo tree search (exact value iteration is cheaper at this size),
hierarchical options (no task needs them yet), evolutionary methods, causal discovery, importing any cognitive
architecture as code (licences and the zero-dependency rule), and large language models as a component. Each
returns to the table when a task is admitted that the tabular agent fails and the method is predicted to solve.
Details: [`LEARNING_MECHANISMS_RESEARCH.md`](../research/LEARNING_MECHANISMS_RESEARCH.md) §16.3.

### AD-10 — Old studies are retired by a closure decision, not run

- **Context.** Nine prepared studies on the legacy agent were never executed (GATE-FLOOR-SCOPE C′, MCF-1, CREDIT-1
  confirmatory, TC-2 AC1–AC49, AC38 feasibility, H1-R Stage 2, M7 Stage 1, FutureScore OQ-1b, LEARN-1). Each
  measures a scoring rule of an agent that AD-1 moves away from.
- **Recommendation.** Retire them in one ruling; supersede COG-A propagation and the ACQ-1 re-test with the
  testbed's hidden-change task. **This needs a Director ruling** (a proposed D-045); it is recorded here as a
  recommendation only. No frozen record is edited or deleted.

---

## Independent falsification review (2026-11-13)

A reviewer that wrote none of the above was asked to find what is wrong with the decisions and with the CF-03b
result. It read the decisions, the architecture, the registry, the CF-03b spec, results, code and tests. It did
not run the tests. Its verdicts and the responses follow. Where the review is accepted, the change is listed; the
original text of AD-1 … AD-10 above is left as written.

| Decision | Verdict | Main objection | Response |
|---|---|---|---|
| AD-1 | Sound with caveats | Its falsifier, H-LEG, is declared descriptive, so it cannot falsify | **Accepted.** H-LEG gets a pre-declared comparison (legacy in map-off mode against Dyna-Q) when its gate is specified |
| AD-2 | **Weak** | The habit learner is worse than random on E3 (522 against 287 steps) and the planner already equals ORACLE on E1, so there is no headroom. Model surprise and reward prediction error are not on one scale, and irreducible edge noise would penalise the planner for ever. The primary metric ignores compute, which is the habit's only advantage | **Accepted.** Arbitration is not built until the hidden-change task is admitted and shows a window where the planner is wrong. Both errors are normalised against their own irreducible floor. A compute-aware metric and a v1-model arm are added to H-ARB. The simpler alternative (planner plus change detection, or discounted counts) is a required baseline |
| AD-3 | **Weak as graded** | A single-generator development gate is not grade 2 evidence | **Accepted.** Regraded to 4: "calibrated on this generator". See the CF-03b findings below |
| AD-4 | Sound with caveats | The sufficiency argument needs stationarity, yet E3 and E2′ are change tasks. Tasks may be designed to justify mechanisms | **Accepted in part.** The claim is restated for stationary phases. Task admission will also require that the mechanism-free planner fails, not only that planner beats habit |
| AD-5 | **Weak** | "Four stores, no other state" contradicts the architecture's own table (Q table, monitor averages, modulator scalars, hyper-prior). The falsifier is unreachable because rejected stores are never built | **Accepted.** Restated as four *memory* stores; controller and monitor state is listed separately. The successor-representation baseline (roadmap M1) is the one rejected store that is built, so the falsifier has a case |
| AD-6 | Sound with caveats | The built agent already adds optimism to values. H-MOD would pass on any change, including harm | **Accepted.** Optimism is declared as a value-level exploration term and an exception. H-MOD needs a direction, not just a difference |
| AD-7 | Sound | — | — |
| AD-8 | **Weak** | The v2 model changes every pair's prediction on every update, so a cached plan is stale by construction. Planning costs milliseconds. The saving threshold is unstated | **Accepted.** H-EVT is deferred to the scale milestone (M8) and needs per-pair prediction versions first |
| AD-9 | Sound with caveats | The aliasing tasks are where latent-state methods are the natural comparison | **Accepted.** A latent-state learner is named as the comparison for the partial-observability milestone |
| AD-10 | Sound with caveats | H1-R Stage 2 is already void; the list double-counts | **Accepted.** Eight studies, not nine, need a closure ruling |
| Whole design | — | Nine subsystems on a world where the planner is at ceiling; most planned gates can show only non-inferiority | **Accepted as the central risk.** Harder tasks and larger worlds come before more mechanism |

### Findings on CF-03b

| # | Finding | Response |
|---|---|---|
| 1 | "Calibrated" is close to "the model matches the generator": reliabilities are U[0.5, 1], whose moment-matched Beta has S = 8, and the model learned μ = 0.739 and S = 8 in 14 of 20 worlds. `gate3b` shares the generator with `dev`, so it guards against overfitting 20 worlds, not the family | **Accepted.** New gate CF-03c: the frozen model on unseen reliability families and on worlds with several destinations per action |
| 2 | Calibration without resolution: 88% of predictions fall in three bins. A forecaster that always outputs the pooled mean might also pass | **Accepted.** CF-03c adds a constant-μ arm and a per-pair Laplace arm, and reports the Brier decomposition |
| 3 | The statistic scores only the modal outcome of pairs that have already moved; untried pairs and the impassable-exit mixture are never scored. No interval on B1 | **Accepted.** CF-03c scores move against stay for every pair, splits exploration from test, and bootstraps B1 |
| 4 | "Cannot be told apart from a perfectly calibrated forecaster" is contradicted by the result's own reliability table: 0.36 → 0.56 and 0.47 → 0.55 are off by about two standard errors. The Beta prior puts mass below 0.5, where the generator has none | **Accepted.** The sentence is withdrawn in an amendment to the results file |
| 5 | No leak of hidden facts or test data was found. The model does build in assumptions the generator satisfies: a failure is a self-transition; reward depends on the arrival state; pairs are exchangeable; actions have one destination | **Accepted** as declared structural priors; CF-03c tests two of them |
| 6 | NOPOOL removes the pooled move prior and the pooled novelty rule together, so "pooling repairs calibration" does not separate them | **Accepted.** CF-03c splits the ablation |
| 7 | Possible inconsistency: `refresh` accumulates pooled totals with weights under the previous hyper-parameters while `compute` subtracts with weights under the new ones. The transition reset can fire on one legitimate failure of a very reliable edge after about 35 successes | **Accepted as open defects.** Neither is fixed in the frozen code. Both get adversarial tests and a fix before CF-03c is frozen |
| 8 | Some tests are weak: one title claims more than it asserts; one inequality is tautological; invariance probes one edge in one world; nothing tests the ECE code or a non-exchangeable population | **Accepted.** Tests are strengthened with the CF-03c work |
| 9 | "Did not cost task performance" omits E1 NAIVE (+2.3 [0.1, 5.6], outside B6) and 61% more sweeps per decision | **Accepted.** Amended in the results file |

**What the review found correct:** the model uses only labels, action indices, reward and done; predictions are
scored before learning; the ECE arithmetic and the noise-floor simulation match the stated statistic; the numerics
tests are real; the spec discloses both development steps and the results disclose their negative findings.

**Standing of CF-03b after review.** The gate verdict stands as recorded: PASS on its frozen criteria. The claim
it supports is narrower than first written: *the v2 model is calibrated on worlds drawn from the generator it was
developed on*. Whether that survives a different reliability distribution is the question for CF-03c.

## Evidence after the review (2026-11-14)

Two frozen gates were run on the questions the review raised. Both went against the original decisions.

| Decision | Gate | Result | Standing now |
|---|---|---|---|
| **AD-3** calibrated belief | CF-03c: the repaired model on four reliability families it had never seen ([results](../../experiments/cf03c/results/RESULTS.md)) | **PARTIAL.** Criteria held in one family of four. A per-pair Laplace forecaster beats the model on two; a constant forecaster beats it on one. In every family the constant forecaster's calibration error is as low as the model's | The model is not "calibrated" in general. The claim stays: calibrated on the generator it was developed on. Calibration error is dropped as a headline statistic; Brier score with its decomposition, against constant and Laplace baselines, replaces it |
| **AD-2** two controllers and reliability arbitration | CF-04: hidden change, then its reversal, 55 worlds ([results](../../experiments/cf04/results/RESULTS.md)) | **NOT SUPPORTED, and harmful** at the tested threshold: planner − ARB = −13.8 steps [−20.0, −7.2]; ARB is also worse than random switching (−11.2 [−20.0, −3.6]) | **Withdrawn at this scale.** Arbitration is not built into the agent. The architecture diagram's monitor, arbiter and habit controller are removed from the build plan. The question reopens only on a task where the planner alone is far from the reference, or where computation is counted |
| **AD-8** planning on demand | Not run | — | Still deferred to the scale milestone |

**What the evidence does support.** Change detection is the largest measured effect in the testbed: removing it
costs +161 steps after a block [135, 188] (CF-04) and +403 on reward relocation [275, 532] (CF-03c battery). The
agent that exists and is supported by gates is: a learned model with pooled priors and change detection, planned
over by value iteration. Nothing else in the target architecture has evidence yet.

**The gap the evidence points to.** After a block is removed the planner is 40 steps behind the reference
[32.5, 48.1], because it almost never re-tests an exit it believes is dead. That, not an executive, is the next
mechanism question.

## Outside review and the owner's decisions (2026-11-14)

An outside review by Gemini was obtained on CF-03c and CF-04. It is lodged verbatim at
`research/external/CF03C_CF04_GEMINI_REVIEW.md` and checked claim by claim against the record in
`research/external/CF03C_CF04_GEMINI_REVIEW_RECONCILIATION.md`. It agrees with both verdicts. It is weak as
independent verification (it largely restates the cover it was given and contains factual errors), but its one
substantive challenge is correct: tabular Q-learning was not a competent fallback controller, so CF-04 is not a
test of arbitration in general.

**The owner's decisions:**

1. World model v3 and its repairs are retained.
2. Calibration claims are restricted to the environments where evidence supports them.
3. Executive arbitration is removed from the integration roadmap for now. Its implementation and evidence are kept.
4. The value-iteration planner is retained.
5. Recovery after a reversed environmental change is the next priority (CF-05), with a count-model Dyna-Q+
   baseline, the cost of exploration measured in unchanged environments, and no addition to the agent unless the
   experiment shows a measurable improvement.

## Recovery after a reversed change (2026-11-15)

### AD-11 — Blanket re-testing is not the way to recover a reopened route (CF-05 closed)

- **Evidence.** CF-05 was closed without a gate run by the owner's decision, as a documented development-level
  negative finding ([closure record](../../experiments/cf05/CLOSURE.md)). On the development worlds, an exploration
  bonus κ√τ inside value iteration and a blanket decay of every belief toward the untried-pair belief recovered
  nothing measurable at their best settings and cost far more at stronger ones; Dyna-Q+ with a count model was
  worse than the planner at every setting. CF-05b later confirmed the Dyna-Q+ result on fresh worlds.
- **Decision.** No blanket exploration bonus or blanket forgetting enters the agent. Implementations are kept for
  research.
- **Not shown.** That no bonus could work: only κ√τ was tried.

### AD-12 — RECALL is not adopted; what it is, and the principled replacement to test

- **Evidence.** CF-05b, SUPPORTED AT A COST ([results](../../experiments/cf05b/results/RESULTS.md)): 18.8 fewer
  steps after the block is removed [12.6, 25.1], two-thirds of the gap to the reference closed; 7.7 more when the
  change is permanent [2.3, 12.1], failing R4. Mostly recovery from real reversals (about 89% of the effect), with
  an interaction the diagnostic arms cannot split cleanly (corrected after adversarial review, 2026-11-15). Point
  break-even reversal probability 0.35 [0.16, 0.51]; at 95% RECALL helps only where more than about half of changes
  reverse and costs where fewer than about a tenth do. Same sign at 48 nodes (non-gating).
- **Decision (owner's Decision 7, and the specification's consequence for this verdict).** RECALL stays a research
  prototype in `cognitive/mind/v4/`. It is not integrated into the agent.
- **What the mechanism is (Decision 7, analysed).** Of the four candidates the owner listed:

  | Candidate | Verdict on the evidence |
  |---|---|
  | Change-detector false-alarm correction | **Minor component, not separable.** The FALSEONLY arm carries 0.9 of 18.8 steps on recovery (4 of 40 worlds) and all of RECALL's small advantage when nothing relevant changed (SHAM); the two parts interact (world 14) |
  | Genuine episodic recall | **The same computation as the next row.** RECALL stores one earlier belief per exit, retrieved by the exit's identity; there is no episode, no cue-based retrieval, no sequence |
  | A latent environmental-state model | **The accurate description.** RECALL is the prediction step of a two-regime hidden state per exit ("as now", "as before the change") with a fixed switching rate h: after τ steps unobserved, P(switched back) = 1 − (1 − h)^τ, which is exactly its mixing weight. It omits the Bayesian update of the regime belief and replaces it with a hard reset when the exit moves |
  | A combination | Latent state for real reversals plus a small false-alarm repair, by the pre-fixed rule |

- **Why a principled model should replace the patch.** RECALL's fixed h is a decision about how often changes
  reverse, made in advance. CF-05b's utility curve shows that the right value depends on the world: helpful above
  p ≈ 0.35, harmful below. A world model that keeps the earlier regime of an exit **inside the model** and **learns
  the switching rate from its own experience** (pooled across exits, as v3 already pools move rates) would re-test
  where changes tend to reverse and stop where they do not. That removes the policy choice of p from the designer and
  is a genuine adaptive capability: learning the volatility structure of the environment.
- **What it needs before it can be tested.** A task with several changes per run, some reversing and some not, at a
  reversal rate set per world family. In E4B there is one change per run, so a reversal rate cannot be learned
  within a run. Proposed as CF-06 (roadmap). Not started.
- **Weak point.** The false-alarm component means v3's change detector sometimes discards good counts (SHAM arm,
  4 of 40 worlds). A model that keeps the earlier regime fixes that too, as a side effect; the detector itself is not
  changed.

## Weak points the author already knows

1. **The whole programme runs on small, mostly deterministic graphs.** A result here says little about larger or
   partially observed worlds until those are built (roadmap M5, M7).
2. **The baselines are weak by modern standards.** Dyna-Q with a last-outcome model is not a strong model-based
   baseline. A count-model Dyna-Q+ and posterior sampling should be added before any claim of superiority.
3. **Two controllers on a 24-node world may never disagree usefully.** If the planner is always reliable and
   cheap, arbitration has nothing to offer; H-ARB may fail for that reason, and that would be a real answer.
4. **Citations in the research files are mostly unverified** (tagged [M]). No design decision rests on a single
   uncited claim, but the reference lists must be checked before publication.

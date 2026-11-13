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

## Independent falsification review

*Pending.* Each decision above is to be challenged by a reviewer that did not write it: what evidence contradicts
it, what simpler design does the same, which assumption is unsupported. The review and the responses are appended
here.

## Weak points the author already knows

1. **The whole programme runs on small, mostly deterministic graphs.** A result here says little about larger or
   partially observed worlds until those are built (roadmap M5, M7).
2. **The baselines are weak by modern standards.** Dyna-Q with a last-outcome model is not a strong model-based
   baseline. A count-model Dyna-Q+ and posterior sampling should be added before any claim of superiority.
3. **Two controllers on a 24-node world may never disagree usefully.** If the planner is always reliable and
   cheap, arbitration has nothing to offer; H-ARB may fail for that reason, and that would be a real answer.
4. **Citations in the research files are mostly unverified** (tagged [M]). No design decision rests on a single
   uncited claim, but the reference lists must be checked before publication.

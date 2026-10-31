# ACQ-1 — does MiniFlyWire acquire hidden edge reliability? (design)

Labels as in `../M1_AUDIT.md`: **FACT**, **PROPOSAL**, **ASSUMPTION**, **OPEN**, **VERIFIED**.

## 1. Why this study exists

ACQ-1 is a **new, separate research question**, version 1. It is not a retroactive change to the COG-A propagation study, whose
estimand θ, decision table and files stay as frozen in `../DESIGN.md`.

Motivation, all development evidence, none of it confirmatory:
- The propagation precondition P2 failed: MFW − random walk agreement with the reliability-optimal set was −0.007
  [−0.057, 0.048] on the 18 accepted development worlds, verified independently from the raw logs (`evidence/p2_audit.txt`).
- P2 cannot say *why*. Audit of the metric (§5) shows raw agreement is confounded by fixed preferences, and it was measured after
  only 1,500 steps.
- A crossover diagnostic (§6) on the 30 development worlds shows no signal in 3,000 steps but a rising one by 12,000 steps
  (`evidence/dev_diag_12000.json`). So the earlier statement that MFW "does not acquire" was too strong: it is withdrawn in
  `../VERIFICATION_REPORT.md`.

The development evidence plans this study. It is not evidence for it, and the confirmatory outcome is not known.

## 2. Question

Within a fixed interaction budget, does MiniFlyWire (map oracles off, hook state P) shift its choices toward the action that is
reliability-optimal **for the environment it actually experienced**, by a scientifically meaningful amount?

## 3. Environment (frozen)

- Graph, slip-in-place dynamics, goal, 150-step episodes, refusals, self no-ops: as `../DESIGN.md` §2.
- A world is one accepted M7 configuration used as **two static environments**: E1 = `pPhase1` for the whole session, E2 =
  `pPhase2` for the whole session. There is no change during a session (`env.mjs`).
- Budget: **12,000 steps** for every agent (`config.mjs`). See §8 for why 3,000 was not used.
- Slip draws: common random numbers per edge and attempt index, shared by both environments and all agents of a world. Episode
  starts: shared start stream for baselines; MFW draws its own starts (FACT, `main.js:3404`).
- Observation: current node, goal, neighbours, last outcome; no p, no distance, no oracle. Topology is available to every agent.

## 4. Agents and fairness

| agent | definition | role |
|---|---|---|
| **MFW-P** | pinned LEARN-0 tree, map off (all four oracles blocked, audited per session), guard ON, hook state P, Variant C clock | **primary agent: unchanged** |
| RW | uniform over neighbours | baseline; ψ = 0 by construction |
| QB-1 | one-step tabular Q, α 0.5, ε 0.10, γ 0.95 (tuned on phase-I performance on development worlds only) | positive control and reference |
| Dyna-Q | QB-1 + classic Dyna-Q, k = 5 | reference: a model-based learner |
| MFW-A | as MFW-P on the pinned CREDIT-1 tree A with `aligned: true` | prespecified secondary arm |
| MFW-H | as MFW-P with M7 hook state H (arm A1, E2 credit, prediction-error pin) | prespecified secondary arm |

- Hook state P stays the primary configuration. A and H are not substitutes: they answer whether existing, separately gated
  mechanisms change acquisition.
- Equal budget in steps. No agent receives p, the phase or an oracle output. MFW holds the adjacency; baselines see neighbours,
  which give no route information about reliability.
- Asymmetry stated as a limit: baselines were tuned; MFW is a fixed runtime with no tuning. Baselines receive r = 1 at the goal;
  MFW uses its internal reward.

## 5. Choice of metric

Two candidates were evaluated (FACT from development data and `test_acq1.mjs`):

| metric | what it measures | defect in raw form |
|---|---|---|
| reliability-optimal agreement | share of decisions in the optimal set of the current environment | **fixed preferences**: a policy that learns nothing can agree strongly or weakly by chance of topology. Test C2: a peaked fixed policy has raw SD 0.288 across worlds against 0.059 for RW. MFW's raw values range 0.14–0.62 with a mean equal to RW's |
| mean reliability of selected edges | mean p of attempted edges | **visitation**: reliable edges keep the walker moving, so even a random walk's edge mix depends on p (RW: 0.743 in E1, 0.548 in E2), and route preferences move it further |

The two do not answer the same question. Agreement asks about decision quality toward the goal, including continuation. Mean
reliability asks about local edges and is goal-blind.

**Decision.** **Reliability-optimal agreement is primary**, because the question is about decisions toward the goal. Mean
reliability is secondary, in state-conditional form R. Both are taken in the **crossover** form below, which removes the two defects.

## 6. Primary estimand

**SWITCH states.** Decision states whose optimal sets in E1 and E2 are robustly different:
`A_k(s; t)` = union over the objectives (expected attempts; discounted, γ 0.95) of the near-optimal set at relative tolerance t,
continuations on G∖{s} (`distal.mjs`). s is SWITCH iff `A_1(s; 2κ)` and `A_2(s; 2κ)` are disjoint. Outcome sets: `A_1(s; κ)`,
`A_2(s; κ)`, κ = 0.10.

**Ties and near-ties.** No single argmax is used. Near-optimal actions are in the set; exact ties have probability zero; disjointness at
2κ excludes near-ties between the two environments.

**Decisions counted.** Edge attempts from a SWITCH state in the window [9000, 12000). A failed attempt is still a decision. A retry after a
slip is a new decision. Self no-ops and refusals are not edge choices and are counted separately.

**Per state.** `f_k(A)` = share of the attempts from s in session k with target in A.

`ψ_s = ½[(f_1(A_1) − f_2(A_1)) + (f_2(A_2) − f_1(A_2))]`

**Weights.** Repeated visits within a state are pooled as shares. Each usable state counts equally in its world (`ψ_w`). Each world counts
equally within its goal. Goals count equally. A state is usable if it has at least one attempt in both sessions.

**Primary estimand.** `Δ = E_w[ψ_w(MFW-P) − ψ_w(RW)]`, the world-paired difference from the random walk.

**Why this is identified.** A policy that does not depend on experienced reliability has the same state-conditional action shares in E1
and E2, so ψ_s = 0 whatever its preferences (test M2, C2). The only difference between the sessions is the reliability vector, so a
non-zero ψ is caused by experience of it. RW's ψ has expectation 0 by construction, and pairing with it removes finite-sample effects
shared by both.

**Worlds with no usable state** contribute nothing and are reported. Development: every world had usable states (6.1 per world on average).

**Secondary, prespecified.** `ψ(MFW-A) − ψ(MFW-P)` and `ψ(MFW-H) − ψ(MFW-P)` (97.5% intervals, Bonferroni over two).
**Descriptive.** R; the learning curve in 3,000-step bins; levels of every agent; `ψ(MFW-P) − ψ(QB-1)`; harmonic-weighted ψ; per-goal
estimates; raw agreement and mean p.

## 7. Analysis

95% stratified t interval [L, U] of the equal-goal mean of Δ_w, with Welch–Satterthwaite degrees of freedom (`analysis.mjs`). The world is
the unit. The percentile bootstrap failed its type I rule in simulation and is kept as a sensitivity analysis only (`POWER_ANALYSIS.md`).
Decision rules: `DECISION_TABLE.md`. The analysis is `analyze.mjs`, frozen before the confirmatory run.

## 8. Horizon and minimum meaningful effect

**Horizon.** 3,000 steps was the M7 budget, not a scientific choice. On development worlds ψ(MFW-P) is flat near 0 to about 6,000 steps,
so a 3,000-step study would test a window in which a slow learner cannot yet show anything. 12,000 steps with the last quarter as the
window gives a fair test without being open-ended. The horizon is chosen on development data and fixed before any confirmatory
outcome. On development worlds ψ(MFW-P) levels off near 0.15 from about 12,000 steps to 36,000 (`evidence/dev_diag_36000.json`), so the
window sits at the plateau. That is a description, not a test.

**δ = 0.10**, on the probability scale of ψ. Rationale, from the meaning of the metric and not from a sample size:
1. **Consequence.** From an uninformed uniform policy, raising the reliability-optimal share at SWITCH states by 0.10 shortens the
   expected steps to the goal by a median 11.6% (mean 13.4%; `evidence/consequence_dev.json`). A shift of 0.05 gives about 6%.
   A change of more than a tenth in time to goal is a material change in behaviour.
2. **Reference.** QB-1 reaches ψ = 0.138 in its first 500 steps on development worlds, so δ asks an agent with 24 times that budget
   for less than a minimal tabular learner shows almost at once.

The 10% reading is a judgment, stated as one. δ was fixed from (1) and (2), which involve no MFW outcome; MFW's development estimate
was known when it was written, so that cannot be excluded as an influence, and the sensitivity rows at δ = 0.05 and 0.15 are reported
for that reason. They do not change the decision.

## 9. Sample size

**n = 100 worlds**, chosen by the rule in `POWER_ANALYSIS.md`, simulated on the actual unit (the world) with the frozen interval.

## 10. Separation of territories

| use | territory | evidence |
|---|---|---|
| development diagnosis, tuning | accepted-stream indices 0–29 (already consumed by XFER-1, LEARN-0, CREDIT-1 development; never confirmatory) | `../config.mjs` |
| QB-1 / random-walk null calibration (propagation study) | development-simulation stream from seed 150,000 | `../evidence/null_calibration_sim.json` |
| power analysis | no configuration: resampled development values | `power.mjs` |
| **confirmatory** | accepted-stream indices **3240–3339**, configuration seeds 365489–369480, 25 per goal, after CREDIT-1's reservation 2032–3239; 0 worlds skipped, 0 collisions | `evidence/allocation.json` (sha256 `04d89b73…`), `evidence/stream_2032_4039.json` |

**Audit (FACT).**
- The study stream is a chain: `generateAccepted(seed, index)`, next index resuming at accepted seed + 1, goal = `GOALS[index % 4]`, so acceptance
  depends on the index. Confirmatory worlds continue LEARN-0's frozen chain (`experiments/learn0/blockL_worlds.json`, last index 2031,
  seed 304469), re-verified on a sample by the real generator (`territory.mjs`).
- Index blocks of all studies on this stream: XFER-1 0–79; XFER-2 80–231; GATE-FLOOR-1 232–391; B2 392–551; HEAD 552–831; PRODSEM 832–1111;
  INTERACTION 1112–1391; C′ 1392–1671; LEARN-0 1672–2031; CREDIT-1 reserved 2032–3239.
- Other streams: registry-consumed 886000–900499 (H1-R, Study 2, C1, M9–M17, UQ-A/B, Q1, M8, M7), held-out ≥ 900500, MCF-1 development
  configuration 100000 / index 1 / accepted 100026, simulation from 150000.
- The registry records nothing on the 200,000 stream. Marking it consumed would make 11 session drivers refuse their own seeds and
  break reproduction, so the registry is **not modified**. ACQ-1 records its allocation in its own frozen evidence file with a seed-level
  collision proof (`allocation.mjs`), including its session streams against the trajectory registry.

The propagation study's proposed confirmatory start moves past the ACQ-1 block if that study is ever run.

## 11. Validity, exclusions, stopping

- A world is void if any of its sessions crashed, did not complete, failed the map audit, had a refusal, a clock violation or an RNG
  instance failure. Void worlds leave every comparison, are listed, and are not replaced. More than 5% void: result VOID.
- A prespecified 10% of worlds repeat variant P; all logs must be byte-identical.
- Fixed n, no interim look, no optional stopping. An implementation defect found after the freeze stops the study.
- No tree builder runs while sessions are running: the builders delete and rewrite a shared directory, and a rebuild under a live
  development run failed 30 sessions (ENOENT at session end; development only, re-run). A session that fails this way is void, never
  silently replaced.

## 12. Parameters

| parameter | value | basis |
|---|---|---|
| γ | 0.95 | a priori (`../census.mjs`) |
| κ | 0.10 | pre-declared census rule, inherited unchanged |
| budget / window | 12,000 / [9000, 12000) | §8 |
| δ | 0.10 | §8 |
| α, ε, k | 0.5, 0.10, 5 | `../evidence/tuning_dev.json`, `../DESIGN.md` |
| n | 100 worlds | power rule, `POWER_ANALYSIS.md` |

## 13. Claim limits

A supported result would establish that, in this 20-node hidden-reliability world, MFW's choices come to depend on the reliabilities
it experienced, toward the better action, by a meaningful amount within 12,000 steps. It would not establish a cognitive map, a world
model, planning, propagation across states, transfer, or which mechanism is responsible. A negative result concerns this budget and
this procedure only.

## 14. Relation to the propagation study

Only after ACQ-1 may the propagation study be revisited. Its frozen estimand assumes 1,500 pre-shift steps, a horizon in which
development shows no acquisition; revisiting it would need a new design version, not a repurposed protocol.

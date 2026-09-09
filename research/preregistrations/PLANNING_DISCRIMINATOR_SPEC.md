# PLANNING / `futureScore` — PRE-REGISTRATION-READY DISCRIMINATOR SPECIFICATION

**Status:** DRAFT — formulation only. **NOT a pre-registration. No hypothesis is frozen.**
This document is the exact text a UQ-B pre-registration would adopt; it is not itself that document.
**Date:** 2026-09-09 · **Authority:** Director ruling of 2026-09-09 accepting path β, adopting the
readout-level shuffled control, and fixing **K = 19**.
**Companions:** `PLANNING_FORMULATION_DRAFT.md` (`d499f60`), `PLANNING_DISCRIMINATOR_ANALYSIS.md`
(`cc97279`), `PLANNING_SHUFFLED_CONTROL_GATE.md` (`0ee851b`).

**Scope.** Read-only formulation pass over committed source. No experiment run, no configuration seed
generated or inspected, no sample size chosen, no hypothesis frozen, no production source modified,
no data collected. UQ-A is not reopened; D-011 is not revisited. The α-vs-β question is **settled and
not reopened**; §1 raises one specification ambiguity inside the accepted design, which is a
completion of the ruling rather than a challenge to it.

---

## 0. What this final pass changed

Three source facts were newly established or corrected. All three strengthen the accepted design.

**0.1 — Correction to `PLANNING_SHUFFLED_CONTROL_GATE.md` §3.** That memo listed
`thoughtTree.push` (`main.js:2709`) among `runPrediction`'s shared-state writes. **It is not a shared
write.** `thoughtTree` is declared `const thoughtTree = []` at `main.js:1420`, **local to
`runPrediction`**, freshly allocated on every call.

> **`runPrediction`'s only write outside itself is `window.lastReasoning` (`main.js:2635`)** — which
> is the readout being taken. Consecutive readouts therefore **cannot contaminate one another.**

**0.2 — The readout is genuinely a readout at the state given.** Scanned over its whole body
(`1390-2722`), `runPrediction` contains **no reference to `agentCurrent`**. It depends only on its
`startKey` parameter. A readout at state `u` is a decision at `u`, not a decision coloured by wherever
the agent happened to stop.

**0.3 — The readout object is the same quantity §14b's liveness criterion uses.** `choices.push({key:
k, weight: arbitratedScore})` (`main.js:2256-2258`); `const sorted = choices.sort((a,b) => b.weight -
a.weight)` (`:2360`); `const bestChoice = sorted[0]` (`:2365`). `weight` is `arbitratedScore`, the
60/40 blend of `main.js:2253`. The greedy readout is the argmax of exactly the quantity that selects
the executed action.

---

## 1. One specification ambiguity in the ruling, resolved — with the reason quantified

The ruling says *"generate exactly 19 shuffled readout arrangements … preserve the same policy
values"*. Two readings are grammatically available, and they are not equivalent.

| | Reading | What is permuted |
|---|---|---|
| **T — term-level** | the gate memo's §1 definition, which the ruling accepted | the `futureBonus` values across the **candidates** within each decision, after which the policy is re-derived |
| **S — state-level** | a literal reading of "arrangements of policy values" | the **chosen actions** across the 19 decision states |

**Reading S must be rejected, and the reason is structural rather than a matter of taste: under S the
null is refuted by construction.**

An action chosen at state `v` is a neighbour of `v`. Assigning it to state `u` usually yields an
action `u` cannot execute at all. Computed over the committed topology (`connections.json`,
`neurons.json` — pure graph arithmetic, no agent, no seed):

| goal | decision states | P(a received action is even *legal* at the state) | upper bound on shuffled alignment |
|---|---:|---:|---:|
| 8 | 19 | 0.1647 | 3.13 / 19 |
| 12 | 19 | 0.1680 | 3.19 / 19 |
| 16 | 19 | 0.1728 | 3.28 / 19 |
| 19 | 19 | 0.1650 | 3.14 / 19 |

Legality is *necessary* for oracle alignment, so those figures bound the shuffled alignment **before
the oracle condition is applied at all**. Roughly **83% of state-level shuffled assignments are
actions the agent could not execute**, and the residual alignment would be far below any plausible
observed value. ARMED would exceed all 19 shuffles almost regardless of whether the mechanism carries
any information — a falsifier that cannot fail, which is the vacuity this program has ruled against
consistently (M7-ERR-10; D-007 §4).

> **Reading T is adopted.** It is the definition in the gate memo the ruling accepted, and it is the
> only one whose null can genuinely survive.

---

## 2. Population — frozen

For each accepted configuration, the population is the **complete set of decision states**, with no
arrival conditioning of any kind:

```
POPULATION(c) = decisionStates(goal(c))        env.js:320-323
              = every non-goal node with >= 2 traversal neighbours
              = 19 states, for every one of the four frozen goals   (verified)
```

Fixed before data, computed from topology and goal alone, identical for every arm and every
arrangement. **No cell is ever missing, so no imputation and no neutral action is required.**

**State ordering, frozen:** ascending node id. It fixes the permutation-seed sequence and nothing
else.

---

## 3. The readout — frozen

At end of run, with learning frozen, for each state `u` in the population:

```
readout(u) = bestChoice.key from runPrediction(u), taken at step === 0
```

- **`bestChoice`, not the executed action.** `main.js:2353-2356` may override the choice with a
  uniform exploration pick. The readout takes the greedy argmax **before** that override, because the
  question is about applied knowledge, not exploration. Capturing it requires a guarded probe of the
  kind Q1 committed at `50be4b4`.
- **Step 0 only.** Steps ≥ 1 are the imagination chain and cannot affect step 0's `bestChoice`,
  which is already determined when they run.
- **Readouts are non-contaminating** (§0.1) and **state-faithful** (§0.2).
- The readout mutates no learned representation: `runPrediction` contains no `updateQ`, `setQ`,
  `dampQ`, `recordAttempt`, `recordSuccess`, `recordTraversal`, `reinforcePath`, `weakenPath`,
  `recordSemanticEdge`, `episodeRecordNode`, `rewardCurrentEpisode`, `sealCurrentEpisode`,
  `rebuildSchemas` or `runConsolidationPass` (verified over `1390-2722`).

---

## 4. Statistic — frozen

```
A(arrangement, phase) = | { u in POPULATION : readout(u) == R_phase(u) } |
```

`R_phase(u)` is `env.reliabilityOptimalPolicy(p_phase, goal).policy.get(u)` — the expected-attempts
optimum (`env.js:342-356`).

**Integer, range 0…19.** Computed **separately for phase 1 and phase 2 and never pooled**: the
readout is one end-of-run policy scored against both regimes, exactly as UQ-A scored one final Q table
against `pPhase1` and `pPhase2`. Phase 1 alignment reads as retention/interference, phase 2 as
adaptation; neither is ever called "performance".

`H_phase(u)`, the hop-optimal action (`env.js:357-372`), is recorded alongside for every state as a
**disclosure**, never as the test statistic.

---

## 5. Null — frozen

> **`H_redistribution`.** *The assignment of `futureBonus` values to the candidates that generated
> them carries no information relevant to correct action selection. Within each decision, every
> arrangement of that decision's `futureBonus` multiset — including the observed identity arrangement
> — is equally good.*

Under `H_redistribution`, the identity arrangement is exchangeable with any other, so the observed
alignment is exchangeable with the 19 shuffled alignments. The assumption is **exact**: no normality,
variance, or independence assumption is used.

**What this null is not.** It is **not** the causal treatment null. It concerns redistribution of the
mechanism's own output within an arm. §9 keeps the two strictly separate, per the ruling.

---

## 6. Permutation procedure — frozen

1. **Unit of permutation.** One decision — one `(state u, step)` — with candidate set
   `allCandidates`, complete at `main.js:1580-1590` before any candidate is scored, of size
   `n(u) ≥ |neighbours(u)| ≥ 3`.
2. **The permutation.** A bijection `σ_u` of `{1…n(u)}` in `allCandidates` iteration order; candidate
   `i` receives `b(k_{σ_u(i)})`. The multiset of values is preserved element for element. Nothing
   else is altered — not the candidate set, not the iteration order, not any other scoring term.
3. **An arrangement** is the tuple `(σ_u)` over all 19 states. **The observed identity arrangement is
   arrangement 0**, one of the `K + 1 = 20` members.
4. **Count.** Exactly `K = 19` shuffled arrangements. Not adaptive, not extendable, not reducible.
5. **Distinctness, and why it is required.** Each of the 19 shuffled arrangements must differ from
   arrangement 0 **and** from every other shuffled arrangement, enforced by redraw under the frozen
   generator. *Reason:* a shuffled arrangement identical to the identity necessarily ties with the
   observed value, and the §8 tie rule then blocks rejection — so collisions would make the realised
   level a function of collision frequency rather than of `K`. Distinctness keeps the level exactly
   `1/(K+1)`.
6. **Generation.** `σ` is drawn by Fisher–Yates from a dedicated deterministic generator seeded by a
   frozen function of `(configuration seed, arm, shuffle index j ∈ 1…19, state u)`. It **must not**
   draw from the `cognitive`, `visual` or `environment` streams, which would perturb the readout it is
   supposed to leave untouched.
7. **Scope within a readout.** The arrangement applies at every scoring decision inside the readout.
   Steps ≥ 1 cannot affect step 0's `bestChoice`, so this choice does not affect the statistic; it is
   frozen for reproducibility only.

**Neutrality, established from source.** `futureScore` and `lookAheadScore` consume no RNG and write
nothing, so the two-pass restructuring the permutation requires is side-effect-free.
`scoring.js:211` draws once per `calculateDecisionScore` call, and a permutation changes neither the
number of calls nor their order — so **candidate `i` receives drift draw `i` under every
arrangement**, and the arrangements differ in the assignment and in nothing else.

---

## 7. Discriminator — frozen

```
REDISTRIBUTION-REJECTED    iff  A(0, phase) > A(j, phase)  for every j = 1…19
NOT-REJECTED               otherwise
```

Evaluated **per configuration, per phase**. Strictly greater than **every** one of the 19. Declared
level `α = 1/(K+1) = 1/20 = 0.05`, one-sided.

**The opposite direction, recorded as a disclosure and not as a second test:**
`A(0, phase) < A(j, phase)` for every `j` is reported as **REDISTRIBUTION-DOMINATES**, the signature of
a mechanism whose own assignment is worse than chance rearrangement of its values. It is reported
because a design that cannot express it is not a test; it does not carry the declared level, and no
second α is spent on it.

---

## 8. Tie rule — frozen

**Ties do not reject.** `A(0) ≥ A(j)` with equality for any `j` fails the strict inequality and
yields NOT-REJECTED. **No post-hoc tie breaking, no jitter, no secondary criterion, no re-ranking, no
mid-p adjustment.** This is what makes the declared level exact rather than nominal.

---

## 9. The two comparisons are separate, and must stay separate

| | Comparison | What it is | What it licenses |
|---|---|---|---|
| **C1 — causal** | ARMED readout vs ABLATED readout, paired per configuration | the total effect of the term on the end-of-run policy, over the full 19-state population, with no conditioning | *"arming the term changes the applied policy, and its alignment differs by X at this configuration"* |
| **C2 — redistribution** | ARMED readout arrangement 0 vs its own 19 shuffles | a within-arm exchangeability test of `H_redistribution` | *"the term's assignment to candidates is / is not distinguishable from arbitrary redistribution"* |

**C2 is not a permutation test of the causal treatment effect and must never be described as one.**
It tests redistribution *within* the armed arm. C1 remains subject to the study-level aggregation
limit established in `PLANNING_DISCRIMINATOR_ANALYSIS.md` §5, which this design does not repeal.

**A built-in wiring control, free and mandatory.** Run C2 on the **ABLATED** readout as well. Under
ablation every `futureBonus` is exactly `0`, so every permutation of a constant vector is the identity
and all 20 arrangements must be **byte-identical**, forcing NOT-REJECTED.

> **If the ABLATED permutation test ever rejects, the implementation is broken.** This is a structural
> control on the machinery, it costs nothing, and it must be reported.

---

## 10. Reproducibility procedure — frozen

1. **Readout RNG.** `runPrediction` draws at `main.js:2353` and `:2356`; `scoring.js:211` draws once
   per candidate. Before **each** `(state, arrangement)` readout, the streams are re-seeded via
   `initRng` (`instrumentation/rng.js:32`) with a frozen function of `(configuration seed, arm,
   state)` — **identical across all 20 arrangements at that state**. Without this the cognitive drift
   differs between arrangements and the comparison is confounded by noise instead of by assignment.
   Re-seeding occurs only after the run has ended and cannot perturb it.
2. **Permutation seeds** per §6.6, from a separate generator.
3. **Frozen before collection:** `K = 19`; the state ordering; the permutation generator and its seed
   function; the distinctness rule; the statistic; the tie rule; the oracle and its phase evaluation;
   the readout definition (`bestChoice` at step 0).
4. **Determinism requirement.** Two independent executions must reproduce every `A(j, phase)` exactly,
   verified as UQ-A verified its own (`K21`/`K22`: fingerprints and per-configuration values identical
   on re-run).
5. **Arm attestation.** Each arm's delivered source is digested and compared against an independently
   recomputed transform, as UQ-A did — so "ABLATED" and "SHUFFLED" remain facts rather than labels.

---

## 11. Hypotheses and falsification — frozen

| | Hypothesis | Falsifier, which can genuinely occur |
|---|---|---|
| **S0** | The term does not change the readout policy. | one state where the ARMED and ABLATED readouts differ. **Structural-zero null**: under a disconnected term the readouts are identical by determinism. Not construction-guaranteed — INERT is a real possible outcome. |
| **S1** | `H_redistribution` — the assignment carries no correctness-relevant information. | `A(0) > A(j)` for all 19 `j` in some configuration. Can occur; and can fail to occur, since the term's fourth component is an information-free field. **Not vacuous:** §1 shows the state-level reading *would* have been, and it is rejected for exactly that reason. |
| **S2** | The assignment is informative for oracle alignment. | `A(0) ≤ A(j)` for at least one `j`. Under `H_redistribution` this occurs with probability `19/20`. |

**No falsifier is construction-guaranteed.** The P4 vacuity guard carries forward: `H_redistribution`
is evaluated over the full 19-state population, never over a subset on which its falsifier would be
structurally forced.

**Two claims remain out of reach and must be excluded from every report.** That the mechanism
contributes information *beyond* what other correlated terms carry (a shuffle destroys the term's
correlation with `qValue` along with its own information); and that the mechanism is *"planning"* —
`PLANNING_FORMULATION_DRAFT.md` §1 shows it cannot read `p_e`, so any reliability alignment is
necessarily indirect through reward memory.

---

## 12. D-011 compliance — verified element by element

| | Element | Where | Satisfied |
|---|---|---|---|
| 1 | Discriminator | §7 | ✔ strict integer comparison over 20 arrangements |
| 2 | Observables | §3, §4 | ✔ `bestChoice` at step 0 over 19 states; oracle from committed exports |
| 3 | Comparison / decision rule | §7, §8 | ✔ including the tie rule |
| 4 | Refutation criteria | §11 | ✔ each can occur; none construction-guaranteed |
| 5 | Identifiability audit | §0, §2, §3, §6 | ✔ from committed source; two prerequisites named in §13 |
| 6 | Stopping / minimum evidence | — | **NOT YET.** Deliberately not chosen here. |
| 7 | Post-hoc prohibition | §14 | ✔ |

**Element 6 is the only one outstanding**, and it is a pre-registration parameter rather than a
formulation question. **The discriminator itself is complete and freezable before any registered
result exists.**

---

## 13. Two implementation prerequisites, named as such

Neither is a scientific question; both are ordinary instrumentation with committed precedent.

1. **A `bestChoice` probe** to capture the greedy argmax at `main.js:2365` before the `2353-2356`
   exploration override — a guarded, default-off probe of the kind Q1 committed at `50be4b4`.
2. **The two-pass candidate-loop restructuring** enabling the permutation, delivered through the
   committed ESM load-hook technique, with mutation controls proving it changes exactly the assignment
   and nothing else — the discipline UQ-A's `verify_uqa.js` applied at 109 assertions.

Both must be verified before collection, and neither may be chosen from results.

---

## 14. K = 19, frozen as a Director judgment

> **`K = 19`, giving a declared one-sided level `α = 1/(K+1) = 1/20 = 0.05`, is a Director
> methodological judgment of 2026-09-09. It is NOT a source-derived quantity.** No committed source
> supports it: the repository has never run a hypothesis test, and M9 §11, Q1 §10 and UQ-A §11 each
> froze a descriptive-only policy. It must be disclosed in these terms wherever it appears, exactly as
> D-006 §4 required for the 20-configuration minimum.
>
> **It is frozen before any planning-study data collection**, may never be revisited, re-chosen,
> supplemented with a second `K`, or accompanied by any additional test. `K` may not be changed in
> response to any observed result, and no post-hoc criterion may be added to rescue a NOT-REJECTED
> outcome.
>
> **This study departs from the descriptive-only statistics policy of its three predecessors.** That
> departure is deliberate, is confined to `H_redistribution` (C2), and does not extend to the causal
> comparison C1, which remains descriptive.

---

## 15. What this document authorises

**Nothing.** It is formulation. No hypothesis is frozen, no pre-registration exists, no configuration
seed or sample size is selected, no production source is modified, no probe or arm is implemented, and
no liveness check has been run.

The next milestone requires its own authorisation.

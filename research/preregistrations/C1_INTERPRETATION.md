# C1 — Interpretation Memo (M20)

**Status:** INTERPRETATION OF A CLOSED DESCRIPTIVE CENSUS
**Milestone:** M20
**Date:** 2026-09-10
**Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-09-10 — *M20, C1 interpretation audit*

**Interprets:** `experiments/c1/results/c1_results.json` and `experiments/c1/data/readouts.jsonl`
(C1 census, commit `b23f2c5`)
**Under:** `C1_PREREGISTRATION.md` v2.0, digest
`a2168c418aaf64b84a3170dba7bd11b4776afd2e0ba8ac1bf42b7c0880f95439` (M17, `f57820b`)

**Required phrasing, reproduced verbatim as C1 v2.0 §15.3 directs:**

> "This is a descriptive census of the accepted configurations of one registered seed block. It
> reports exactly measured per-configuration causal effects and their distribution. It performs no
> statistical inference and licenses no generalisation beyond the configurations enumerated."

**Nothing was rerun. No frozen artifact, datum, definition or registry entry was modified.**

---

## 0. A sign-direction correction, stated before anything else

The M20 ruling contains one sentence that inverts the frozen convention, and every number below
would be read backwards if it stood:

> *"Positive Δ means ABLATED ranked the oracle-optimal action higher than ARMED. Therefore positive
> Δ is descriptively favorable to ARMED under the E6 oracle-alignment measure."*

The first clause is correct. **The second does not follow.** The frozen text, C1 v2.0 §2, reads:

> "Lower `ρ` means the oracle-optimal action is ranked more highly. **A negative `Δ` therefore
> means ARMED ranks the oracle-optimal action higher than ABLATED.** Direction is fixed here so it
> cannot be chosen after seeing data."

Since `Δ = ρ_ARMED − ρ_ABLATED` and **lower `ρ` is the better alignment**:

| | meaning | descriptively favourable to |
|---|---|---|
| **`Δ < 0`** | ARMED ranks the oracle-optimal action higher | **ARMED** |
| **`Δ > 0`** | ABLATED ranks the oracle-optimal action higher | **ABLATED** |

**Verified against the data, not merely against the text.** Of 1042 cells where ARMED placed `v*`
nearer rank 0, 909 (87.2%) have `δ < 0`; of 1072 where ABLATED did, 987 (92.1%) have `δ > 0`. The
residual in each direction is the declared normalisation effect of §2.1, quantified in §4.3 below.

**Consequence.** Both phases have a positive census mean and a positive-leaning sign count, so the
census is **descriptively favourable to ABLATED — the arm without `futureBonus`** — under the E6
oracle-alignment measure. This memo uses the frozen convention throughout. PASS 2 checks the whole
memo for accidental sign reversal, which is the very hazard the ruling asked me to look for.

---

## 1. Executive conclusion

Across the **70** accepted configurations of registered block `895000–895999`, the normalised
oracle-alignment rank difference `Δ_E6` had a **small positive census mean in both phases**
(0.0433 phase 1, 0.0385 phase 2) against a **much larger spread** (SD 0.127 and 0.109; IQR 0.174
and 0.167; range 0.610 and 0.434). A **majority of configurations were positive** — 43/70 and
45/70 — but **both signs are well represented in both phases**, and no configuration was exactly
zero.

Under the frozen convention this is **descriptively favourable to ABLATED**, and the effect is
**small relative to configuration-to-configuration heterogeneity**. Those two facts are the whole
of the finding.

---

## 2. Exact descriptive findings

| | phase 1 | phase 2 |
|---|---|---|
| `N` | 70 | 70 |
| mean | **0.043257** | **0.038500** |
| median | 0.057500 | 0.031036 |
| SD (census spread only) | 0.126793 | 0.109337 |
| min / p05 / p10 / p25 | −0.2409 / −0.1759 / −0.1148 / −0.0423 | −0.1541 / −0.1235 / −0.1009 / −0.0455 |
| p50 / p75 / p90 / p95 / max | 0.0575 / 0.1321 / 0.1970 / 0.2375 / 0.3691 | 0.0310 / 0.1217 / 0.1956 / 0.2240 / 0.2797 |
| IQR | 0.174403 | 0.167232 |
| range | 0.610053 | 0.433863 |
| **negative — favours ARMED** | 27 (38.6%) | 25 (35.7%) |
| **positive — favours ABLATED** | 43 (61.4%) | 45 (64.3%) |
| zero | 0 | 0 |

The proportions describe this census. They are **not** estimates of any probability and must not be
compared to 0.5 or called significant (§9.3).

**Other preregistered diagnostics.** Raw rank spanned 0–12 (ARMED mean 2.385) and 0–11 (ABLATED
mean 2.336). Pool size spanned 1–13 (ARMED mean 5.674) and 1–12 (ABLATED mean 5.919). **Weight
ties: 0.** `E1` ranged 10–19, median 15, mean 14.69, with **zero configurations at `E1 = 0`**, so
the exposure reached the measured object in every configuration and no configuration was excluded
by the §10 validity condition.

---

## 3. Phase comparison

The two phases score the **same end-of-run policy** against two different oracles, so they are not
independent measurements.

- Census means differ by **0.004757** — the two aggregate pictures are close.
- **46 of 70** configurations share the sign of `Δ` across phases; **24 do not**.
- Per-configuration disagreement is substantial: median `|Δ₁ − Δ₂| = 0.0827`, max **0.3684** —
  larger than either census mean.

**Descriptively: the phases agree closely in aggregate and disagree considerably per
configuration.** Phase 2's distribution is slightly tighter (SD 0.109 vs 0.127; range 0.434 vs
0.610) and slightly more positive-leaning by count (45 vs 43).

---

## 4. Configuration heterogeneity

### 4.1 The spread dominates the centre

SD (0.127, 0.109) is roughly **three times** the census mean (0.043, 0.039), and IQR (0.174, 0.167)
is roughly four times it. Both tails are populated: phase 1 runs from −0.2409 to +0.3691.

### 4.2 The mean is not the artefact of a few configurations — but it is not robust either

| | phase 1 | phase 2 |
|---|---|---|
| census mean | 0.043257 | 0.038500 |
| mean after removing the 1 largest \|Δ\| | 0.03853 | 0.03500 |
| … 3 largest | 0.03219 | 0.02837 |
| … 5 largest | 0.03319 | 0.02238 |
| … 10 largest | 0.02541 | **0.00846** |
| leave-one-out mean range | [0.03853, 0.04738] | [0.03500, 0.04129] |
| leave-one-out sign flips | **0** | **0** |
| share of total \|Δ\| held by the top 10% | 23.4% | 25.4% |

**No single configuration determines the sign of either census mean.** But the positive centre
**attenuates markedly** as the largest contributors are removed — in phase 2 the mean falls to
0.0085, close to zero, once the ten largest are set aside. The positive lean is therefore
distributed across many configurations *and* materially weighted by a minority of large ones.
Both statements are true and both are reported.

### 4.3 Goal-level structure

| | phase 1 | phase 2 |
|---|---|---|
| goal 8 (n=15) | mean 0.04682, neg/pos 4/11 | mean 0.06750, neg/pos 2/13 |
| goal 12 (n=17) | mean 0.04124, neg/pos 6/11 | mean 0.03178, neg/pos 8/9 |
| goal 16 (n=18) | **mean 0.09681**, neg/pos 6/12 | mean 0.03090, neg/pos 9/9 |
| goal 19 (n=20) | **mean −0.00590**, neg/pos 11/9 | mean 0.02929, neg/pos 6/14 |

**Goal 19 in phase 1 is the only goal/phase cell with a negative mean and a negative-leaning sign
count** — the only stratum descriptively favourable to ARMED. Goal 16 in phase 1 carries the
largest positive mean. Phase 2 is more uniform across goals.

### 4.4 The normalisation, quantified

Of 2613 jointly-defined cells: **2114 rank-moved**, 343 **normalisation-only** (`r` equal, `n`
differs), 1665 **both**, 156 identical. In **218 of the 2114 rank-moved cells (10.3%) the sign of
the normalised `δ` differs from the sign of the raw rank difference** — the pool-size denominator
reverses the direction that raw rank alone would give.

This is the treatment-dependence C1 v2.0 §2.1 declared in advance: `ρ` is a **normalised
total-effect outcome**, not a within-fixed-pool contrast. ARMED's mean pool size is smaller (5.674
vs 5.919), so the two arms are not normalised by the same denominator.

---

## 5. Undefinedness and missingness

| | phase 1 | phase 2 | total |
|---|---|---|---|
| cells | 1330 | 1330 | 2660 |
| jointly defined | 1308 | 1305 | 2613 |
| **armedOnlyUndefined** | **0** | **0** | **0** |
| **ablatedOnlyUndefined** | **0** | **0** | **0** |
| neitherDefined | 22 | 25 | 47 |
| `n1Armed` / `n1Ablated` | 18 / 18 | 18 / 18 | — |
| `asym = 0` configurations | 70 / 70 | 70 / 70 | — |

**Asymmetric arm-definedness did not occur: 0 cells in 2660.** C1 v2.0 §7.1 required this to be
monitored precisely because it was structurally possible and could have shaped the jointly-defined
population by treatment. It did not. Consequently the `asym = 0` stratum (§9.6.2) is **identical**
to the primary report, and `n = 1` occurred **symmetrically** (18/18 in each phase).

`jointlyDefined` ranged 16–19 (phase 1) and 15–19 (phase 2), median 19. The stability curve is flat
for `k = 1, 5, 10, 15` — all 70 configurations qualify — and changes only at `k = 19`, where `N`
falls to 52 (mean 0.0247) and 51 (mean 0.0430).

---

## 6. The goal-16 limitation

**46 of the 47 undefined cells occur in goal 16** (the 47th in goal 12), by reason `n < 2` (36) and
`v*` absent (11).

**This is a descriptive structure of the census, not an exclusion criterion.** It was handled
exactly by the frozen protocol: those cells were dropped by pairwise deletion on definedness alone,
never by any outcome magnitude, and no rule was added.

Two facts bound how it can be read:

1. **All 18 goal-16 configurations are affected** — undefined-cell counts per configuration are
   `[2×12, 3×3, 4×2, 5]`, and **none has zero**. So this is a systematic property of goal-16
   configurations in this census, not a handful of outliers.
2. **Because none is unaffected, a within-goal-16 comparison of affected vs unaffected
   configurations does not exist.** The census cannot separate "goal 16 behaves differently" from
   "goal 16 has fewer defined cells". I checked for that comparison and report that it is
   unavailable rather than constructing a substitute.

Goal 16 nonetheless contributed the largest positive phase-1 mean (0.09681) on 18 configurations
with 16–19 defined states each — it is not a sparsely-measured stratum in absolute terms.

---

## 7. Evidence → inference → hypothesis

### A. What C1 directly measures — **EVIDENCE**

For each accepted configuration, the position of the environment-defined oracle-optimal action
within the agent's decision-time candidate pool, under two full 3000-tick experiential histories
that differ only in whether `futureBonus` was delivered or forced to 0. Every quantity in §2–§6 is
an **exact measurement** of the enumerated census: 1000 seeds, 4000 candidates, 70 accepted, 140
runs, 2660 cells, 0 invalid, 0 failed.

### B. What the distribution permits about the intervention **in this enumerated population** — **INFERENCE**

1. The ARMED-vs-ABLATED intervention **changed the greedy policy in every configuration** — `E1`
   was never 0, ranging 10–19 of 19 states.
2. Over this census, the intervention's average effect on normalised oracle-alignment rank is
   **positive and small**: mean 0.0433 (phase 1) and 0.0385 (phase 2). Because both arms were run
   on every configuration under a deterministic runtime, these census means **are** the average
   treatment effect over this enumerated population — exactly, not estimated.
3. That average is **small relative to heterogeneity** (SD ≈ 3× the mean) and **not uniform**: 27
   and 25 configurations run the other way, and goal 19 phase 1 reverses at stratum level.
4. Part of the measured difference is **normalisation-carried**: in 10.3% of rank-moved cells the
   normalised sign opposes the raw-rank sign, and the arms have different mean pool sizes.

### C. Untested — **HYPOTHESIS**

- That this pattern holds in **any population beyond these 70 configurations**. C1 has no sampling
  frame and cannot address it.
- **Why** the difference arises. C1 measures *that* the ranking position differs and by how much,
  never a mechanism.
- Whether the goal-19-phase-1 reversal or the goal-16 undefinedness reflect anything structural.
- Whether the normalisation-carried component would change the picture under a different, un-frozen
  outcome definition.

---

## 8. What C1 establishes

1. A **complete, verified descriptive census** of `Δ_E6` over the accepted configurations of one
   registered block, with every per-configuration value published.
2. That the intervention **reached the measured object everywhere** (`E1 ≥ 10`, never 0).
3. That over this census the intervention's average effect on normalised oracle-alignment rank was
   **small, positive in both phases, and descriptively favourable to ABLATED**, against
   heterogeneity several times larger than the average.
4. That **asymmetric arm-definedness did not occur** (0/2660), so the jointly-defined population was
   not shaped by treatment in this census.
5. That the instrument behaved as the M19 stress test found: **0 weight ties**, ranks spanning 0–12,
   pools spanning 1–13, no degenerate structure.

## 9. What C1 does not establish

1. **Nothing beyond the enumerated configurations.** No generalisation, to other blocks or in
   general.
2. **Nothing about planning, cognition, reasoning, internal representations, `futureScore`, or
   uncertainty.** E6 measures a ranking position, and the construct name is frozen as
   *oracle-alignment of the candidate-ranking policy* for exactly this reason.
3. **Nothing about mechanism** — not why the difference arises.
4. **No comparison with UQ-B.** UQ-B measured the **pre-M11-repair** substrate; M11 established the
   substrates differ materially. The two are not comparable and are not juxtaposed here.
5. **No statistical claim.** No test was performed, none is licensed, and the absence of a large
   census mean is not evidence of no effect anywhere.

---

## 10. Recommended scientific next decision

**Recommendation: do not run another experiment yet. Close C1 and record the substrate limit it
exposed.**

The ruling asks whether the existing evidence is sufficient for a scientifically meaningful next
decision. It is — and the meaningful decision is a **stop**, not a follow-up.

C1 did what it was designed to do: it produced an exact, verified description with a declared
scope. The scope is the point. Its central quantity is **small relative to heterogeneity**, and a
non-trivial share of it is **normalisation-carried** (§4.4) — so the most informative next step is
not another measurement on the same substrate but a decision about **what the program wants to
measure**.

Three things follow, in order:

1. **Close C1 formally.** The census is complete, verified, and interpreted within its licensed
   language. Nothing further is extractable from it without violating its frame.
2. **Record the standing blocker.** Every study in this line has now been limited by the same
   thing: **no sampling frame over configurations**. It forced the inferential layer out of C1
   (M17), made adequacy uncertifiable (M19), and bounds this memo to one block. Defining such a
   frame is a scientific commitment, not an experiment — and until it exists, every successor study
   will terminate in a descriptive census of one block.
3. **Only then** consider a successor, and choose its estimand knowing that `ρ`'s normalisation
   carries treatment dependence by construction (§2.1, quantified at 10.3% sign reversal in §4.4).

I am **not** recommending a follow-up experiment on the strength of the goal-19-phase-1 reversal or
the goal-16 undefinedness. Both are interesting; neither is a finding this census can support, and
chasing either would be exactly the post-hoc pattern-following this program has repeatedly and
correctly refused.

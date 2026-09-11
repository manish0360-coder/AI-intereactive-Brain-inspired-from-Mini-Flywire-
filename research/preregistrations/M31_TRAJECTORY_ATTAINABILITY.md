# M31 — Trajectory-Multiplicity Attainability Determination

**Status:** SPECIFICATION (PASS 1) + IMPLEMENTATION & VERIFICATION (PASS 2)
**Milestone:** M31
**Date:** 2026-09-11
**Authority:** Director ruling of 2026-09-11 — *M30 ACCEPT WITH REPAIRS → M31 AUTHORIZED*

**Development fixtures only. ZERO registered seeds consumed** — asserted per child by
`inRegisteredBlock`, and re-verified independently in PASS 2. No registry, production, C1, UQ-B or
M7 change. No preregistration. No registered collection authorised.

> **Scope, stated so it cannot be mistaken.** This establishes only whether the proposed `C × R`
> **design is empirically attainable**. It is **not** evidence about `futureScore`, **not** a
> mechanism claim, and **not** a result about any registered population. **Nothing here is
> comparable to C1**, and no number below may be read as revising C1's measurements.

---

## 1. Verdict

> # M31-YELLOW
>
> **`C × R` is empirically attainable.** Every failure mode tested passed: trajectories are
> distinct, E6 responds to them, definedness holds, and the arms are measurably distinguishable.
>
> **But one consequential issue remains, and it is a hard gate:** registered trajectory seeds
> **cannot be drawn under any existing governance**, because the registry cannot represent the
> trajectory namespace (M30 §13). That is formulated at §7 and **not implemented**, per the ruling.
>
> **And the pilot changed the design.** Within-configuration trajectory spread is **the same order
> as — and in one case larger than — C1's entire between-configuration SD.** A future study should
> therefore prioritise **|R| over |C|**, which is the opposite of C1's shape. §8.

---

## 2. The scientific question, and the minimum sufficient study

**Question:** *Does varying `agentSeed` produce enough distinct, E6-relevant trajectory variation to
make a `C × R` study informative — and does anything about the design fail before collection?*

**Design (minimum sufficient, and why):**

| Choice | Value | Why this is the minimum |
|---|---|---|
| configurations | **2** development fixtures — `896066/0` (goal 8), `896238/2` (goal 16) | One would leave any finding possibly a property of a single goal. More adds runs without changing what is asked: the question is about `R`, not `C` |
| trajectory seeds | **6**, in **two declared regimes** | **Adjacent** (`base+0..+3`) is the *hard* case — if mulberry32's avalanche were weak on nearby seeds, collisions appear here first (M26 raised exactly this). **Distant** (`base+1000003`, `+2000003`) tests the other regime. Testing one regime only would leave the other's failure undetected |
| arms | both, per cell | the frozen intervention is preserved |
| anchor | seed `20260819000` included | the grid contains the trajectory C1 actually used |
| **total** | **24 runs** of 3000 ticks (212 s) | enough to detect *presence* of every failure mode; **not** enough to estimate any rate precisely, and no rate is claimed |

**No acceptance threshold is used anywhere.** Every failure mode is evaluated as *observed / not
observed*, and §5's K6 is reported in whichever direction it came out.

### 2.1 Revisions to the Director's candidate questions

| Director's question | Disposition |
|---|---|
| 1. different seeds → different trajectories? | **kept** — K1 |
| 2. what is `m(r\|c)`? | **kept but narrowed**: a 6-seed pilot can establish *whether* collapse occurs, **not** estimate a rate. Stated as such |
| 3. are the arms still pairable? | **kept** — K3, and it produced the study's firmest evidence |
| 4. how often do arms diverge in RNG consumption? | **merged into 3** — one measurement answers both; keeping them separate would double-count |
| 5. does E6 vary across trajectories? | **kept** — K2 |
| 6. can sign reversal occur within a configuration? | **kept** — K6 |
| 7. does `C × R` justify its cost? | **deferred, and deliberately.** A 2-fixture pilot cannot answer a cost-justification question for a registered census. §8 supplies what the pilot *can* contribute: the **allocation** between `|R|` and `|C|` |
| **ADDED — K8** | **is the existing fingerprint adequate to distinguish trajectories?** Not in the Director's list, and load-bearing: every other answer depends on the identifier being sound |

---

## 3. The scientific object

| Object | Definition | Distinct in this study? |
|---|---|---|
| `agentSeed` | one integer | the **sampling device** |
| RNG stream | the four streams derived from it (`run.js:318–321`) | — |
| RNG realisation | the emitted sequence | — |
| **effective stochastic trajectory** | the equivalence class of runs sharing a fingerprint | **the scientific object whose multiplicity matters** |
| trajectory fingerprint | `sha(artifacts)` incl. `cogDraws` (`run.js:352`) | the identifier |
| learned-state trajectory | the run's resulting stores | summarised inside the fingerprint |
| E6 outcome | `Δ` over jointly-defined cells | the measured quantity |

**None of the three forbidden identities is assumed:** different seeds ≠ different trajectories
(tested, K1); same seed ≠ same trajectory across arms (tested, K3); different trajectories ≠
different E6 (tested, K2).

### 3.1 K8 — fingerprint adequacy, settled first

The fingerprint hashes `writes, qEntries, qSum, pathAttemptKeys, pathSuccessKeys, creditKeys,
creditRejected, envCounters, attempts, successes, slips, laSteps, dampInvoked, cogDraws, visDraws`.

> It contains **both** the learned-state summary **and** exact RNG consumption. Two runs agreeing on
> all of that are trajectory-equivalent for every purpose M30 cares about. **It is adequate, and no
> new measurement was required.** *Its one limitation is honest: agreement is sufficient for
> equivalence, but the hash cannot say how far apart two differing runs are.*

---

## 4. Arm pairing — CRN adopted, with its assumption stated

Three constructions were considered:

| | Construction | Verdict |
|---|---|---|
| **A** | same `agentSeed` for both arms (**CRN**) | **ADOPTED** — both arms start from identical streams; the shared sequence induces positive outcome correlation, reducing contrast variance |
| **B** | independent `agentSeed` per arm | **REJECTED** — discards the variance reduction and confounds the arm contrast with trajectory difference |
| **C** | re-randomise per readout state | **REJECTED** — the readout is already separately seeded and M28 established E6 is invariant to it; this would change nothing and complicate provenance |

**The assumption CRN rests on, now measured rather than assumed:** the arms *do* diverge in the
shared sequence (K3, below). **Divergence does not invalidate pairing** — pairing controls the
environment and the starting stream, not the realised draws (M30 §9). **But CRN's variance-reduction
benefit decays as divergence grows**, and §5 shows divergence here is large. *That is a limitation
of the pairing's efficiency, not of its validity.*

---

## 5. Results — failure modes, each re-derived independently in PASS 2

**24 runs, 2 fixtures × 6 trajectory seeds × 2 arms, 456 cells.**

### K1 — trajectory collapse: **NOT OBSERVED**

| Fixture / arm | distinct fingerprints |
|---|---|
| `896066/0` ARMED · ABLATED | **6 / 6** · **6 / 6** |
| `896238/2` ARMED · ABLATED | **6 / 6** · **6 / 6** |

**All 24 runs produced distinct fingerprints, in BOTH regimes** — adjacent consecutive seeds
included. **`m(r|c) = 1` throughout this sample.** The collapse M26 warned was structurally expected
**did not occur here**.

> *Bounded honestly: 6 seeds cannot estimate a collision rate. This establishes that collapse is not
> pervasive at this scale; it does not establish that it never occurs.*

### K3 — arm divergence: **CONFIRMED, and large**

`cogDraws` differ between arms in **12 of 12 cells**. Relative divergence **min 0.7%, mean 13.4%,
max 39.0%**; raw difference ranges `−35 490` to `+9 549` draws.

> **This converts M30's INFERENCE into EVIDENCE.** M30 could only reason that the arms must diverge,
> because C1 never persisted `cogDraws`. They do, and by a large margin.

### K2 — E6 varies across trajectories: **YES, substantially**

| Fixture | phase | mean Δ | **SD across trajectories** | range | neg/pos |
|---|---|---|---|---|---|
| `896066/0` goal 8 | 1 | 0.0982 | **0.0857** | −0.0360 … 0.2415 | 1/5 |
| `896066/0` goal 8 | 2 | 0.0608 | **0.1301** | −0.1231 … 0.2672 | 2/4 |
| `896238/2` goal 16 | 1 | −0.0669 | **0.0472** | −0.1443 … −0.0182 | 6/0 |
| `896238/2` goal 16 | 2 | 0.0365 | **0.0785** | −0.1293 … 0.1204 | 1/5 |

> **The comparison that matters, stated with its scope.** C1's **between-configuration** SD was
> **0.1268 (ph1) / 0.1093 (ph2)**. The **within-configuration trajectory** SD observed here is
> **0.047 – 0.130** — the **same order**, and in one cell (`896066/0` ph2, **0.1301**) **larger than
> C1's entire between-configuration SD.**
>
> **These are development fixtures.** This does **not** establish anything about C1's registered
> census. What it establishes is that trajectory variation is **not a small perturbation** on this
> substrate — which is exactly the attainability question.

### K6 — sign reversal within a configuration: **OBSERVED in 3 of 4 configuration-phases**

`896066/0` ph1, `896066/0` ph2, and `896238/2` ph2 each contain both positive and negative `Δ`
across trajectories. Only `896238/2` ph1 held one sign (6/0 negative).

> **At a fixed configuration, the direction of the measured contrast flips depending on which
> trajectory the agent happened to take.** The design has the power to detect this — which is the
> attainability result. **Whether it occurs in the registered population is untested and is not
> claimed.**

### K5 — definedness: **HOLDS**

456 cells: **432 jointly defined (94.7%)**, 24 neither-defined, **0 armed-only, 0 ablated-only**,
12 cells with `n = 1`. **No asymmetric arm-definedness** — matching C1's 0/2660. **No collapse.**

### K4 — excessive multiplicity: **NOT TRIGGERED**

K4 asked whether too many seeds are needed to obtain distinct trajectories. With K1 at 6/6 in every
group, **one seed yields one trajectory**; the concern does not arise at this scale.

### K7 — sampling distortion: **NOT APPLICABLE HERE**

K7 concerns multiplicity changing an aggregate. With `m(r|c) = 1` observed, no weighting distortion
arises **in this sample**. *It remains a live risk at larger `|R|` and is not dismissed.*

### K8 — fingerprint adequacy: **PASSED** (§3.1)

---

## 6. Was the failure-mode set right?

| | Verdict |
|---|---|
| K1, K2, K3, K5, K6 | **necessary and each fired informatively** |
| K4 | **redundant given K1** — it is K1 restated as a rate. Kept for completeness, reported as not-triggered |
| K7 | **not testable at `m(r|c) = 1`** — retained as a forward risk, not a pilot outcome |
| **K8 (added)** | **necessary, and logically prior to all others** — every other verdict depends on the trajectory identifier being sound |

---

## 7. Registry governance — formulated, NOT implemented

M30 §13 established the collision: `isConsumed(20260819000) === false` while
`isHeldOut(20260819000) === true`, because `isHeldOut(s) = s ≥ 900500` treats configuration-seed and
`agentSeed` space as one integer line.

**Minimum governance structure, formulated only:**

1. **Separate namespaces.** Configuration seeds and trajectory seeds are different populations and
   must be governed by different predicates. A single integer line cannot represent both.
2. **Held-out ranges are per-namespace.** The `≥ 900500` floor is a *configuration-seed* floor. A
   trajectory namespace needs its own reserved region, or none — but the current predicate must not
   silently apply to it.
3. **Consumption is recorded per namespace**, with the same chain convention the existing registry
   uses (each successor declares what the previous study consumed).
4. **Reuse.** A trajectory seed **may** be reused across *different* configurations — it indexes a
   random sequence, not an environment. It **may not** be reused to re-measure the same
   `(configuration, arm)` cell, which would be reproduction, not replication.
5. **Development fixtures stay separate.** M31's trajectory seeds are declared development values and
   must not enter any registered trajectory block.

> **I have not modified the registry.** The ruling permits formulation only, and my audit does **not**
> find implementation to be strictly within M31's authorised scope: M31 was authorised to determine
> attainability, and a registry change alters governance that other studies depend on. **It requires
> separate Director authorization.**

---

## 8. What the pilot changed about the design

**Allocation.** C1's shape was **many `C`, one `R`**. The pilot shows within-configuration
trajectory SD (0.047–0.130) is the **same order as** C1's between-configuration SD (0.109–0.127).

> **INFERENCE (about the design, not about C1): a study that adds configurations while holding
> trajectories at one would keep buying precision on the smaller of the two spreads.** For the
> question M30 posed, **`|R|` is worth more per run than `|C|`** — the opposite of C1's allocation.

**Cost.** 9.6 s per 3000-tick run, single-process. `|C| × |R| × 2 × 9.6 s`. The pilot's contribution
to the cost question is this rate plus the allocation finding; **it does not settle whether a
registered census is worth running**, and §2.1 records that as deliberately deferred.

---

## 9. R5

**Unchanged and not silently redefined.** The development fixtures are accepted under the frozen
predicate (asserted per child: `if (!cfg0.accepted) throw`). **R5 does not interact with trajectory
variation** — acceptance is computed from the configuration alone, before any run, with no agent and
no arm (M24-R1 §2.1c). Varying `R` cannot change which configurations are eligible.

> The hypothesis-adjacent eligibility limitation (M25 §5) is **inherited unchanged** by any future
> `C × R` study.

---

## 10. Evidence → Inference → Hypothesis

**EVIDENCE** *(this study, development fixtures)*
- **Ev-1.** 24/24 runs produced distinct fingerprints, in both adjacent and distant regimes.
- **Ev-2.** `cogDraws` differ between arms in 12/12 cells; relative divergence 0.7%–39.0%.
- **Ev-3.** Within-configuration Δ SD across trajectories: 0.0857, 0.1301, 0.0472, 0.0785.
- **Ev-4.** Sign reversal across trajectories in 3 of 4 configuration-phases.
- **Ev-5.** 432/456 cells jointly defined; 0 asymmetric arm-definedness; 12 cells at `n = 1`.
- **Ev-6.** `E1 ∈ [10, 17]` across all cells — the exposure reached the measurement everywhere.
- **Ev-7.** Every `rho` equals `r/(n−1)` and every `delta` equals `rhoA − rhoB`, recomputed
  independently over 432 cells with 0 mismatches.

**INFERENCE**
- **In-1.** Trajectory collapse is not pervasive at this scale ⇒ K1 does not block the design.
- **In-2.** The arms diverge materially in RNG consumption ⇒ **M30's inference is now evidence**;
  CRN remains valid but its variance-reduction benefit is reduced.
- **In-3.** Trajectory variation is comparable in magnitude to C1's between-configuration spread ⇒
  `|R|` deserves priority over `|C|` (§8).
- **In-4.** The existing fingerprint is an adequate trajectory identifier ⇒ no new instrumentation.

**HYPOTHESIS**
- **Hy-12.** That `m(r|c) = 1` holds at larger `|R|`. **6 seeds cannot establish a rate.**
- **Hy-13.** That sign reversal across trajectories occurs in the **registered** population.
  **Untested. Development fixtures are not a census**, and this must not be read as a statement
  about C1.
- **Hy-14.** That the within/between magnitude relation holds beyond these two fixtures.

**Not claimed:** that C1 is invalid; that C1's signs are unstable; that `futureScore` does or does
not do anything; that trajectory robustness is mechanism evidence.

---

## 11. Outcome

> # M31-YELLOW
> **`C × R` is empirically attainable. One consequential governance issue remains, and the design's
> allocation has changed.**

Not GREEN: registered trajectory seeds cannot be drawn under any existing governance (§7), and that
is a hard gate before any registered collection. Not HOLD: nothing structural blocks the design —
every failure mode tested passed.

### Single highest-value next milestone

> ## M32 — Trajectory-Seed Namespace Governance
> *Formulation and, if the Director authorises it, implementation of the registry change.*
>
> §7's five requirements, specified and then — **only under separate Director authorization** —
> implemented in `experiments/registry/`. It is logically prior to every registered `C × R` study,
> because without it no trajectory seed can be drawn, recorded, or protected.
>
> **The `895000–895999` missing-link defect should be resolved in the same authorization**, since
> both are registry-integrity items and fixing one while leaving the other open would be arbitrary.

**Not recommended as next:** a registered `C × R` collection. It is gated on M32, and §2.1 records
that its cost-justification remains deliberately unanswered.

---

Believe in yourself and keep going

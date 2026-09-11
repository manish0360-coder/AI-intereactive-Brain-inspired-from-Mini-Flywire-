# M21 — Next Research Question Formulation

**Status:** FORMULATION ONLY — no experiment, no preregistration, no implementation, no seeds
**Milestone:** M21
**Date:** 2026-09-10
**Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-09-10 — *M20 ACCEPTED, C1 CLOSED; formulate M21*

> **M21-R1 — REPAIR APPLIED, Director ruling of 2026-09-11 (M21 ACCEPT WITH SPECIFIC REPAIR).**
> The original I-5 and L-A stated that part of the observed C1 difference **is carried by** pool
> change. That asserted a causal attribution the record does not establish. Both are repaired to the
> licensed formulation — *because `ρ = r/(n − 1)`, a smaller candidate pool produces a larger
> normalised rank at the same raw rank; therefore treatment-dependent pool size **can** contribute
> to the observed E6 contrast even when raw rank is unchanged* — and the four levels are now kept
> explicitly apart: **observed co-occurrence**, **mathematical consequence of normalisation**,
> **causal pathway**, and **unresolved hypothesis**. See I-5(a)–(d). The superseded wording remains
> in the git history at `9ab7427`; it is corrected forward here, not erased.

**North Star (unchanged, not redesigned):** MiniFlyWire discovers and validates cognitive
mechanisms that can later be reimplemented by Noetica. The frozen
MiniFlyWire → Noetica → Velith → Mini Prometheus architecture is untouched by this memo.

**Nothing was run. No production source, frozen artifact, preregistration, datum, or registry
entry was modified. No seed was generated, inspected, or consumed.** Every quantity below is read
from the committed record and cited to its commit.

---

## 0. The frozen interpretation, carried forward verbatim

```
Δ = ρ_ARMED − ρ_ABLATED            Lower ρ means better oracle alignment.
Δ < 0  favours ARMED               Δ > 0  favours ABLATED
```

C1 produced a **positive finite-population mean Δ in both phases**: **+0.043257** (phase 1) and
**+0.038500** (phase 2). Under the frozen convention this is **descriptively favourable to
ABLATED** over the registered C1 census.

**This memo does not reinterpret that result as any of the following, and no section below may be
read as doing so:** `futureScore` being harmful; uncertainty being harmful; planning being harmed;
cognition being harmed; a cognitive primitive being falsified; a mechanism being discovered. It is
strictly **a descriptive ARMED-vs-ABLATED E6 result over the registered C1 census.**

**C1's limitation, carried forward:** C1 is a descriptive census of **one registered configuration
block** (895000–895999). It does not generalise beyond that enumerated population. 46 of 47
undefined cells occurred in goal 16. Differential arm-definedness was **zero** (0 of 2660 cells).
**The goal-16 concentration is a descriptive structure of the census and must never become a
post-hoc exclusion criterion.**

---

# PASS 1 — SCIENTIFIC SYNTHESIS

## 1.1 Established evidence

Facts measured, verified, and committed. Each is exact over its own enumerated population.

| # | Evidence | Source |
|---|---|---|
| **E-1** | **UQ-A census**, block 898000–898999, 96 configurations. Direction counts of the paired Spearman `ρ(Q_final, p_e)` difference: phase 1 ARMED-higher 50 / ABLATED-higher 45 / equal 1; phase 2 40 / 55 / 1. **Coverage** (count of fixed-population entries with an explicit Q entry at end of run) 39 / 34 / 23. | `uqa_results.json` |
| **E-2** | **UQ-B census**, block 897000–897999, 71 configurations. C2 (within-arm exact test of `H_redistribution`): **0 rejections of 71 in both phases** against a known null expectation of 3.55. | `uqb_results.json`, `1cc441f` |
| **E-3** | **UQ-B C1 direction counts**: phase 1 ARMED-higher 18 / ABLATED-higher 39 / equal 14; phase 2 18 / 43 / 10, on an **alignment-count** outcome (matches of the end-of-run greedy policy against the oracle over 19 decision states). | `uqb_results.json` |
| **E-4** | **`canReachGoal` defect**: 9 false negatives in 80 audited cases, 1 decision-fatal, from a shared-`visited` incompleteness. Repaired; 0 introduced. | `0227a5f`, `0f47d7b` |
| **E-5** | **Candidate-filter audit**: F3 verified against its own source-stated rule. **F1's threshold `10` and F2's threshold `−0.5` appear in no committed specification.** Of F1's three penalty producers, **two are structurally incapable of ever exceeding the threshold**. | `d945ce6` |
| **E-6** | **Pool membership differs between arms**: M14 pilot found pool membership differing in **71 of 76** state-rows. | `b825d1a`, C1 v2.0 §2.1 |
| **E-7** | **C1 census**, block 895000–895999, 70 configurations, 140 runs, 2660 cells, 0 invalid, 0 failed. Mean Δ **+0.043257** / **+0.038500**; SD **0.126793** / **0.109337**; signs 27/43 and 25/45; **no exactly-zero configuration**. | `b23f2c5`, `c9307b9` |
| **E-8** | **C1 exposure**: `E1` ∈ [10, 19], mean 14.69, **never 0** — the intervention reached the measured object in every configuration. | `c9307b9` |
| **E-9** | **C1 pool asymmetry**: ARMED mean pool **5.674** vs ABLATED **5.919**; ARMED mean raw rank **2.385** vs ABLATED **2.336**. | `c9307b9` |
| **E-10** | **C1 normalisation carriage**: of 2613 jointly-defined cells, 2114 rank-moved, 343 normalisation-only, 1665 both, 156 identical. In **218 of 2114 rank-moved cells (10.3%)** the normalised `δ` sign **opposes** the raw-rank difference. | `c9307b9` |
| **E-11** | **C1 definedness**: differential arm-definedness **0 of 2660**; 47 neither-defined, 46 in goal 16 and 1 in goal 12; **all 18** goal-16 configurations affected. | `c9307b9` |

## 1.2 Valid descriptive inferences

Licensed **only** over each study's own enumerated population.

- **I-1.** Over the C1 census, the ARMED-vs-ABLATED intervention's average effect on normalised
  oracle-alignment rank is exactly **+0.043257** / **+0.038500**. Because both arms ran on every
  configuration under a deterministic runtime, these are the average treatment effect over that
  enumerated population — exact, not estimated.
- **I-2.** That average is **small relative to heterogeneity** (SD ≈ 3× the mean) and **not
  uniform**: 27 and 25 configurations run the other way.
- **I-3.** The intervention **changed the greedy policy in every C1 configuration** (E-8).
- **I-4.** The C1 jointly-defined population was **not shaped by treatment** (E-11), so the census
  mean is not a definedness artefact.
- **I-5 — repaired at M21-R1. Four statements, deliberately kept apart:**
  - **(a) Mathematical consequence of the normalisation.** Because `ρ = r/(n − 1)`, a smaller
    candidate pool produces a **larger normalised rank at the same raw rank**. Therefore
    **treatment-dependent pool size *can* contribute to the observed E6 contrast even when raw rank
    is unchanged.** This follows from the definition alone and would hold if no data had been
    collected.
  - **(b) Observed co-occurrence.** Over the C1 census, ARMED's mean pool is smaller (5.674 vs
    5.919) and in 218 of 2114 rank-moved cells the normalised `δ` sign opposes the raw-rank
    difference (E-9, E-10). These are exact measurements of co-occurrence.
  - **(c) Causal pathway — NOT established.** That the observed C1 difference **is** caused, in
    whole or in part, by pool-size or admission effects **does not follow** from (a) and (b)
    together. (a) establishes possibility, (b) establishes co-occurrence; neither establishes
    attribution.
  - **(d) Unresolved hypothesis.** Which pathway carries the observed contrast, and in what
    proportion, is **open** — it is exactly what H-1/H-2/H-3 below propose to make testable.

  Statement (a) is an inference about the *instrument's definition*; (b) is evidence; (c) and (d)
  mark the boundary this memo must not cross.

## 1.3 Remaining hypotheses — untested

- **H-1 (ranking pathway).** The intervention changes where the oracle-optimal action sits within a
  *given* choice set.
- **H-2 (admission pathway).** The intervention changes *which candidates are admitted* to the
  choice set — via learned state feeding F1/F2/F3 — and the measured differences are substantially
  carried by that.
- **H-3 (both).** Both pathways contribute non-trivially, in proportions currently unknown.
- **H-4 (outcome-family artefact).** The ABLATED-leaning direction is a property of the
  alignment/rank **outcome family** rather than of the intervention.
- **H-5.** Anything about *why* the goal-19-phase-1 stratum reversed, or *why* goal 16 is sparse.
- **H-6.** Anything about any population beyond the three enumerated blocks.

**H-1, H-2 and H-3 are mutually discriminable. H-4 is discriminable only after them.** No committed
measurement currently separates any of them.

## 1.4 Questions UQ-A / UQ-B / C1 can no longer answer

- **Anything requiring their seed blocks.** 897xxx, 898xxx, 896xxx (development), 899xxx and
  900000–900499 are consumed; ≥ 900500 is held out and must never be touched.
- **UQ-B's C2 question (`H_redistribution`).** Its 0/71 outcome (E-2) is uninformative: the
  rejection region was not attainable given pool structure, so the observed result was the only one
  the design could produce. C1's instrument-adequacy register records this as failure mode **L4**
  — *"the outcome was forced by construction"*. UQ-B cannot be reopened to fix it.
- **Any generalisation from any of the three.** None has a sampling frame.
- **The pathway decomposition, from existing data.** See §1.5 — this is the decisive limitation.

## 1.5 Instrument limitations now understood

- **L-A — the confound is structural, declared, and unresolved.** E6 is a **normalised total-effect
  outcome**: `ρ_a(u,p) = r_a(u,p)/(n_a(u) − 1)` where `n_a(u)` is *itself a function of the arm*.
  C1 v2.0 §2.1 states this and forbids describing E6 as a within-fixed-pool contrast. **Repaired at
  M21-R1:** because `ρ = r/(n − 1)`, a smaller pool produces a larger normalised rank at the same
  raw rank, so **treatment-dependent pool size can contribute to the observed E6 contrast even when
  raw rank is unchanged** — a consequence of the definition, not a finding. Separately, and as
  co-occurrence only, ARMED's mean pool in the C1 census is the smaller of the two (E-9, E-10).
  **Whether that possibility is realised in the observed contrast is unresolved** (I-5c, I-5d), and
  nothing here may be read as saying the C1 difference is known to be caused by pool-size or
  admission effects.
- **L-B — the same limitation is program-wide, not a C1 quirk.** UQ-A's **coverage** diagnostic
  (E-1) is explicitly declared *"part of the total causal pathway"* and *"never an adjustment, a
  covariate, or a filter"*. UQ-B's alignment count is an argmax over the same arm-dependent pool.
  **Every outcome this program has used is computed within, or normalised over, a set whose size and
  membership the treatment itself changes.**
- **L-C — C1 recorded enough to *detect* the confound, not enough to *decompose* it.** Its cells
  carry `state, phase, vStar, rA, nA, rhoA, whyA, rB, nB, rhoB, whyB, bothDefined, delta, bestA,
  bestB, tiesA, tiesB` — rank and pool **size**, but **not pool membership**. C1 §8 made `r` and `n`
  mandatory precisely so a reader could see how much of Δ *co-occurs* with pool change; that is
  co-occurrence, not decomposition. **The decomposition is therefore not computable from the C1
  census, and reopening C1 would not make it computable.**
- **L-D — no sampling frame over configurations.** This forced inference out of C1 at M17, made
  adequacy uncertifiable at M19, and bounds every result to one block.
- **L-E — a specification gap sits directly in the admission pathway.** F1's and F2's thresholds are
  in no committed specification (E-5), and F1 is *near-inert* by construction. The pathway most
  likely to carry the effect runs through the components the record says are unresolved.

## 1.6 Scientific opportunities created by the C1 result

- **O-1.** C1 produced the first **exact, verified, per-configuration causal quantification** in the
  program, with a direction fixed in advance and an executable gate binding the report to the data.
- **O-2.** C1's mandatory diagnostics **located the confound precisely** (E-9, E-10). The program now
  knows *where* its central quantity is ambiguous — which is the precondition for removing the
  ambiguity.
- **O-3.** **The discriminating measurement is already prototyped in committed evidence.** M14's
  attainability probe (`experiments/m14/m14_attainability.json`, `b825d1a`) recorded, per state,
  **full pool membership with weights for both arms** (`poolA`, `poolB`) plus **cross-pool ranks**
  (`rAinB`, `rBinA`). In its first development fixture, at phase 2 the oracle-optimal action
  (candidate `6`) is present in **both** arms' pools yet sits at **rank 2 of 7 under ARMED and rank
  7 of 8 under ABLATED** — rank 0 meaning ranked first, the E6 convention — a ranking difference on
  a *common* candidate, isolated from admission. *This is one development fixture on non-registered
  territory,
  cited solely as evidence that the measurement is constructible. It is not evidence about the
  mechanism and carries no scientific weight.*
- **O-4.** Because C1's direction was frozen and its report is gate-bound, a successor can be
  compared to it **without** re-litigating sign or reporting discipline.

## 1.7 Governance finding — an outstanding registry link (reported, NOT acted on)

`experiments/registry/consumed.js` records 896xxx, 897xxx, 898xxx, 899xxx and 900000–900499, with
the held-out floor at 900500. **It does not record C1's own block 895000–895999.** `isConsumed(895500)`
returns **false**.

This is not a defect in C1 — C1 correctly imports the registry and guarded itself against every
*prior* block. It is the **successor link that has not yet been written**: by the registry's own
chain convention, each study declares what the *previous* study consumed, and the link for C1 does
not exist because the last link (`c59d457`) predates C1's collection.

**Consequence:** as the record stands, a future study could draw new measurements from 895xxx and
believe the territory unspent. **This must be closed before any future study selects seeds.**

**I have not modified the registry**, because the ruling forbids it. This is flagged as an
administrative action requiring Director authorization, not folded silently into a formulation
milestone.

---

# PASS 2 — INDEPENDENT RESEARCH-DIRECTION AUDIT

## 2.1 The smallest useful candidate set

Six candidates. Each is stated as a question, then challenged adversarially.

| | Candidate question |
|---|---|
| **Q-A** | Can a sampling frame over configurations be defined that would license generalisation? |
| **Q-B** | **Does the measured ARMED-vs-ABLATED difference arise from ranking a given choice set, or from changing which candidates enter it?** |
| **Q-C** | Does the C1 result replicate on a new registered block under the same E6 instrument? |
| **Q-D** | Why are ARMED's candidate pools systematically smaller? |
| **Q-E** | Is the ABLATED-leaning direction a property of the outcome family rather than the intervention? |
| **Q-F** | Should F1's and F2's unspecified thresholds be given a committed specification? |

## 2.2 Evaluation against the Director's criteria

| Criterion | **Q-A** frame | **Q-B** pathway | **Q-C** replicate | **Q-D** why smaller | **Q-E** outcome family | **Q-F** spec gap |
|---|---|---|---|---|---|---|
| Scientific value | High but methodological | **Highest** | Low | Medium | High | Low (engineering) |
| North Star connection | Indirect — enables transfer | **Direct — decides what is reimplementable** | None new | Partial | Indirect | None |
| Unresolved question answered | L-D | **L-A, L-B, L-C; H-1/H-2/H-3** | none | part of H-2 | H-4 | L-E |
| Distinguishes competing hypotheses | No — no hypotheses | **Yes — H-1 vs H-2 vs H-3** | No | Weakly | Yes, but only after Q-B | No |
| Requires a new sampling frame | **It *is* the frame** | **No** | No | No | No | No |
| Requires a new instrument | No | **Yes — but prototyped (O-3)** | No | Yes | Yes | No |
| Risks repeating UQ-B/C1 failures | Low | **Attainability must be proven in advance** | **High — L4 forced-outcome risk** | High | Medium | n/a |
| Transferable to cognitive research | Enabling only | **Yes — directly** | No | Partial | Partial | No |
| Could justify promoting a mechanism | Not alone | **Yes — it is the precondition** | No | Not alone | No | No |
| Information gain vs cost | Medium / high cost | **High / medium cost** | **Near zero / high cost** | Medium / high | Medium / medium | Low / low |

## 2.3 Adversarial challenge of each candidate

**Q-C — replicate E6 on a new block. Reject.** This is the tempting default and it is close to
worthless. A second census would produce a second exact description of a second enumerated
population, with no more generalisation than the first, while consuming a registered block and
inheriting **every** limitation in §1.5 unchanged. It would tell us the confounded quantity again.
*Optimising for "doing another experiment" is exactly what this would be.*

**Q-A — solve the sampling frame first. Defer, and the ordering argument is decisive.** Q-A is a
genuine blocker and I named it in the M20 memo. But it is the blocker on **generalisation**, whereas
Q-B is the blocker on **interpretation** — and interpretation is prior. *There is no value in
generalising a quantity that cannot be interpreted.* If the program solved the sampling frame first,
it would earn the right to generalise E6 — a quantity that, per L-A, mixes ranking with admission.
It would generalise a confound. Q-B is also strictly cheaper and, critically, **does not require
Q-A to be solved first**, because it asks about pathways *within* each configuration rather than
about a population parameter.

**Q-D — why are ARMED's pools smaller. Subsumed and premature.** This presupposes that the pool
difference is what matters, which is precisely what Q-B tests. Asking *why* before establishing
*whether it carries the effect* is building a mechanism story on an unmeasured premise — the failure
mode this program has repeatedly refused. If Q-B shows the admission pathway dominates, Q-D becomes
the natural successor. If it shows the ranking pathway dominates, Q-D is largely uninteresting.

**Q-E — outcome-family artefact. Genuinely valuable, but second.** H-4 is a real hypothesis, and the
convergence in E-1/E-3/E-7 makes it live. But H-4 and H-2 are **confounded with each other**: both
UQ-B's alignment count and C1's `ρ` are computed over an arm-dependent pool (L-B), so an
"outcome-family" effect and an "admission-pathway" effect would look identical today. **Q-B
disentangles them; Q-E cannot be cleanly posed until it has.**

**Q-F — specify F1/F2. Engineering, not science, and it would contaminate the record.** These
thresholds sit in the live admission path. Specifying — and therefore potentially changing — them
before Q-B measures that path would alter the substrate mid-question, exactly as M11's repair made
UQ-B's substrate incomparable to C1's. **Document the gap; do not touch the thresholds.**

**Q-B — the residual challenge, stated honestly.** Q-B does **not** solve L-D. Its result would be
another descriptive census, bounded to its own block, with no generalisation. That is a real
limitation and I am not disguising it. The claim is narrower and, I think, correct: Q-B changes
**what the measured quantity means**, from a confounded total effect into a decomposition whose
components are individually interpretable. A confounded quantity cannot be handed to Noetica at any
sample size; a decomposed one can be handed over even from a single block, as a *mechanism
characterisation to be re-tested*, which is precisely MiniFlyWire's role in the frozen architecture.

---

# SINGLE NEXT BEST RESEARCH QUESTION

> **Does the ARMED-vs-ABLATED difference in oracle-alignment arise from how the mechanism *ranks* a
> choice set that both arms share, or from how the mechanism *changes which candidates enter* that
> choice set — and in what proportion?**

## Why this is now the highest-value question

1. **It is the only question that makes any existing result reimplementable.** The North Star is
   that MiniFlyWire discovers and validates mechanisms **Noetica can reimplement**. A total-effect
   measurement confounded across two pathways (L-A) cannot be reimplemented: an engineer cannot
   build "a ranking effect plus an admission effect in unknown proportion." A decomposition can.
2. **It attacks a program-wide limitation, not a C1 quirk.** L-B shows UQ-A's coverage, UQ-B's
   alignment count, and C1's `ρ` all share it. Answering Q-B retro-illuminates the interpretation of
   **all three** completed studies — the highest leverage available anywhere in the record.
3. **It does not require the sampling-frame problem to be solved first**, so it is not blocked by the
   thing that has blocked everything else.
4. **The measurement is already prototyped** in committed evidence (O-3), so this is a principled
   extension rather than a new invention.
5. **It is precisely and only about the instrument and the pathway.** It makes no claim about
   `futureScore` being harmful or beneficial, about planning, uncertainty, or cognition — and it
   cannot be turned into one, because it asks *through which route* a described difference travels,
   not *whether the mechanism is good*.

## Competing hypotheses it distinguishes

| | Hypothesis | Meaning |
|---|---|---|
| **H-1** | **Ranking pathway** | Holding the choice set fixed, the arms order the oracle-optimal action differently |
| **H-2** | **Admission pathway** | The arms admit different candidates; the difference is carried by set composition |
| **H-3** | **Both** | Both contribute non-trivially, in a measurable proportion |

## What would count for or against each

- **For H-1:** on the choice set both arms share, the two arms' weightings place the oracle-optimal
  action at materially different positions — as in the O-3 fixture, where a *common* candidate sits
  at rank 2 of 7 under one arm and rank 7 of 8 under the other.
- **Against H-1:** on the shared set, the arms rank the oracle-optimal action near-identically, and
  the full-pool difference is recovered almost entirely by re-adding arm-exclusive candidates.
- **For H-2:** the shared-set contrast is near-zero while the full-pool contrast is not; the
  difference tracks admission events (arm-exclusive candidates, pool-size change).
- **Against H-2:** removing arm-exclusive candidates leaves the contrast substantially intact.
- **For H-3:** both components are individually non-negligible across the census — the outcome I
  consider most likely, given E-9 (ARMED ranks *and* pools both differ) and E-10 (10.3% sign
  opposition, i.e. the two components already demonstrably disagree in direction in some cells).

**Direction must be frozen in advance, as C1 §2 froze Δ's, before any such measurement is defined.**

## Required measurement capability

Per decision state, for both arms: **full candidate-pool membership with weights** — not merely rank
and size. From that, three quantities computed under one frozen definition: the contrast on the
**shared** choice set, the contrast on each arm's **full** pool, and the **residual** between them.

## Is the existing E6 instrument sufficient?

**Insufficient — and not repairable by re-running it.** E6 is by frozen definition a normalised
total-effect outcome (C1 v2.0 §2.1), and C1's readouts record pool **size** but not **membership**
(L-C). No re-analysis of the C1 census can decompose it. **A new instrument, and new collection, are
required.** E6 is not thereby invalidated: it remains the correct measure of the total effect, and
the successor's shared-set contrast should be defined so that E6 is recoverable from the
decomposition — otherwise the two studies cannot be related.

## Must the sampling-frame problem be solved first?

**No — and that is a principal reason to choose this question now.** Q-B is a question about
pathways *within* each configuration; each configuration yields its own decomposition, and the
census reports their distribution exactly as C1 did. **This does not repeal L-D**: the result would
again be bounded to one enumerated block and would license no generalisation. The gain is
interpretive, not inferential — and per §2.3 it is the prior of the two.

## Inside MiniFlyWire, or deferred?

**Inside, unambiguously.** Separating a mechanism's contribution from its side effects on the choice
set *is* mechanism discovery and validation — MiniFlyWire's stated role. Deferring it to Noetica
would hand downstream engineers a confounded quantity and ask them to disentangle it in a system
built for reimplementation, not for measurement. That inverts the frozen architecture.

---

# DECISION TREE

```
QUESTION
  Does the ARMED/ABLATED oracle-alignment difference travel through the
  RANKING pathway, the ADMISSION pathway, or both — and in what proportion?
        │
        ▼
REQUIRED EVIDENCE
  Per decision state, per arm: full candidate-pool MEMBERSHIP with weights,
  the oracle-optimal action, and its position under each arm's weighting on
  (a) the shared choice set and (b) each arm's full pool.
        │
        ▼
DISCRIMINATING MEASUREMENT
  A shared-choice-set contrast, defined and direction-frozen in advance,
  reported alongside the full-pool contrast and their residual — with
  ATTAINABILITY PROVEN BEFORE COLLECTION (the UQ-B C2 / L4 failure mode:
  a region that cannot be reached teaches nothing).
        │
        ├── OUTCOME 1 — ranking dominates (H-1)
        │     CONSEQUENCE: the effect is a scoring property, the strongest
        │     candidate the program has for a reimplementable mechanism.
        │     Next: characterise the scoring rule; the frame problem (Q-A)
        │     becomes the binding constraint on promotion.
        │
        ├── OUTCOME 2 — admission dominates (H-2)
        │     CONSEQUENCE: the effect is largely a side effect on the choice
        │     set, and E6-family outcomes across UQ-A/UQ-B/C1 are re-read as
        │     substantially set-composition effects. Q-D and the F1/F2
        │     specification gap (L-E) become the live questions. No mechanism
        │     is promoted.
        │
        ├── OUTCOME 3 — both contribute (H-3)
        │     CONSEQUENCE: the proportion becomes the quantity of interest;
        │     any future outcome must report both components separately.
        │     Q-E (outcome-family) becomes cleanly posable for the first time.
        │
        └── OUTCOME 4 — the decomposition is not attainable
              CONSEQUENCE: an honest negative about the instrument family.
              Recorded as a closed limitation; the program turns to Q-A.
              DETECTED BEFORE COLLECTION if the milestone does its job.
```

**Every outcome, including 4, is scientifically informative.** That is the test C1's own adequacy
register (L4) says a design must pass, and it is why this question is worth asking.

---

# WHAT NOT TO DO

1. **Do not run another E6 replication on a new block.** It would re-measure a confounded quantity
   and consume a registered block for near-zero information gain (Q-C).
2. **Do not attempt to explain the positive C1 Δ without a discriminating measurement.** Any account
   of *why* Δ came out positive — pool size, filter behaviour, learning dynamics — is a story fitted
   to an observed sign. **No explanation of the C1 result may be advanced, in any artifact, until a
   measurement capable of distinguishing the competing explanations exists.**
3. **Do not reinterpret the positive Δ** as `futureScore` being harmful, uncertainty being harmful,
   planning or cognition being harmed, a primitive falsified, or a mechanism discovered.
4. **Do not treat the goal-16 concentration as an exclusion criterion**, a filter, a covariate, or a
   reason to restrict any successor's population.
5. **Do not pool or compare C1 with UQ-B as replication.** M11 changed the substrate between them;
   they used different blocks, different estimands, and different instruments. The convergence in
   E-1/E-3/E-7 is a **hypothesis-generating observation (H-4) and nothing more.**
6. **Do not tune, specify, or otherwise touch F1's or F2's thresholds** (L-E). Changing the admission
   path before measuring it would repeat the substrate-discontinuity that made UQ-B incomparable.
7. **Do not reopen, re-run, or re-analyse C1, UQ-A or UQ-B.** C1 is closed; the decomposition is not
   computable from its data (L-C), so reopening it would gain nothing and cost integrity.
8. **Do not build the successor on the goal-19-phase-1 reversal or any other single stratum.** An
   interesting pattern is not a research question.
9. **Do not promote anything to Noetica.** No validated mechanism exists yet; that is the point of
   the question being asked.
10. **Do not solve the sampling frame first** merely because it is the older blocker — it would
    license generalisation of an uninterpretable quantity (§2.3).
11. **Do not invent statistical methodology, thresholds, significance criteria, or a preregistration
    at this stage.** None appears in this memo, and none may be introduced until formulation closes.
12. **Do not touch seeds.** Nothing may be generated, inspected, or consumed — and nothing at or
    above the held-out floor **900500** may ever be touched.

---

# RECOMMENDED NEXT MILESTONE

> ## M22 — Pathway-Decomposition Formulation
> ### *Ranking versus admission in the oracle-alignment effect*

**Purpose.** To determine, **on paper and before any measurement is designed**, whether the ranking
and admission pathways can be separated by a well-posed measurement — and to establish in advance
whether such a measurement's outcome is **attainable**, so that the UQ-B C2 failure (a rejection
region that could not be reached, C1 adequacy register **L4**) cannot recur.

**Scope — formulation only.** M22 must:

1. State the decomposition precisely enough to be falsifiable, and **freeze its direction convention
   in advance**, as C1 v2.0 §2 froze Δ's.
2. Determine whether a **shared choice set** is well-defined at a decision state where the two arms
   carry different learned state — including what to do when the shared set is empty or has fewer
   than two members, which the derived `n ≥ 3` boundary from C1's formulation makes a live concern.
3. Determine whether **E6 is recoverable** from the decomposition, so C1 and its successor are
   relatable rather than merely adjacent.
4. **Establish attainability before anything is built** — enumerate the outcomes the design could
   produce and demonstrate that more than one is reachable.
5. Report honestly if the decomposition proves **not** well-posed. *Outcome 4 is an acceptable and
   informative result of M22, and must not be avoided by weakening the question.*

**M22 must not:** implement anything; consume, generate or inspect any seed; modify production
source, any preregistration, any frozen artifact, or the seed registry; create a preregistration;
introduce any threshold, statistical method, or significance criterion; or advance any explanation of
the C1 result.

**Prerequisite flagged for Director decision, not folded into M22:** the outstanding registry link
for **895000–895999** (§1.7). This is administrative, must be authorized separately, and **must be
closed before any successor study selects seeds** — but it is not part of a formulation milestone and
I have not acted on it.

---

## Evidence → Inference → Hypothesis, restated for this memo

- **Evidence** — §1.1 (E-1…E-11): exact measurements over enumerated populations, each cited to a
  commit.
- **Inference** — §1.2 (I-1…I-5): licensed **only** over those same enumerated populations. I-5
  concerns the instrument, not the mechanism.
- **Hypothesis** — §1.3 (H-1…H-6) and every candidate question in PASS 2: **untested**. The selected
  question is a proposal to make H-1/H-2/H-3 discriminable. **Nothing in this memo asserts which is
  true, and no reader may take the selection of Q-B as evidence for any of them.**

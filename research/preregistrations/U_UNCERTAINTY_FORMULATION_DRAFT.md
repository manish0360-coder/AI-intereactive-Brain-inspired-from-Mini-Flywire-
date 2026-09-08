# U-UNCERTAINTY — Research Track Formulation Draft

**Prepared:** 2026-09-03 · **Author:** Chief Systems Engineer
**Status:** **DRAFT FORMULATION — NOTHING FROZEN, NOTHING AUTHORISED**
**Basis:** committed artifacts at `e4a1d09`

> ## STATUS
>
> A **candidate cognitive-mechanism research track**, not a pre-registration, not a design, not an
> authorisation. It does not modify or reprioritize the existing roadmap.
>
> Unresolved items are marked **OPEN**. Where committed source does not establish something, this
> document says **NOT ESTABLISHED**.
>
> **No data collected. No seed generated or inspected. No instrumentation implemented. No production
> code modified. No novelty formula invented.**

---

## 1. The finding that reframes this track

**MiniFlyWire already implements uncertainty-aware cognition.** Two modules exist and are wired into
the decision path:

| Module | Lines | Consumed by |
|---|---:|---|
| `render/uncertaintyEngine.js` | 291 | `main.js:405` → `getUncertaintyScore`, `updateUncertainty`, `decayUncertainty` |
| `render/uncertaintyLedger.js` | 516 | `main.js:334–343` → 8 functions; also `render/candidateAnalysis.js:68` |

And uncertainty already **conditions behaviour**. `render/scoring.js:315–316`:

```js
const uncertaintySemanticDamp =
    1.0 - Math.min(uncertaintyScore * 0.5, 0.4);
```

applied at `scoring.js:344, 345, 404` to `meaningBoost` and `semanticVitalityScore` inside the
decision score.

**Therefore "add uncertainty-aware cognition" is not an available research question.** The track must
be formulated against what already exists, or it will restate implemented machinery as a discovery —
the M8 failure mode at the level of a whole research programme.

---

## 2. Grounding in the existing research programme

**Vision** (`research/00_research_vision.md`): MiniFlyWire "shifts the focus from **behavior** to
**representation**", and every mechanism must satisfy four conditions — (1) a clearly defined
cognitive hypothesis, (2) experimental isolation from other mechanisms, (3) quantitatively measurable
causal contribution, (4) falsifiability through controlled experiments.

**Core question** (`research/01_core_question.md`, status *Candidate, pending internal review*): what
computational mechanisms enable artificial cognitive systems to acquire, organize, refine and
transfer computational knowledge across changing environments and tasks?

**Ontology** (`research/01_cognitive_ontology.md`): **a stub.** All five top-level branches read "(To
be defined)". `research/02_hypotheses.md` and `research/03_metrics.md` are **empty files (0 lines)**.

> **OPEN — a programme-level dependency, not a U-UNCERTAINTY question.** This track would place
> uncertainty inside branches 2 (Internal Representations), 3 (Cognitive Processes) and 4
> (Motivation & Control) of an ontology that does not yet define them. Whether the ontology should be
> populated first is a Director decision this document does not make.

**Condition (3) — causal contribution — is what distinguishes this track from U1.** U1 was
constrained to observation and died because exposure and outcome shared one object (D-010). The
vision explicitly requires *causal* measurement, and the architecture already supports ablation.

---

## 3. What exists, precisely — the three-layer distinction

The Director's requested separation, resolved against source:

| Layer | Definition | Status in the committed architecture |
|---|---|---|
| **Uncertainty estimation** | producing a scalar/posterior over outcome reliability | **EXISTS AND IS CONSUMED.** `getUncertaintyScore` (engine); `getProceduralUncertainty`, `getCombinedUncertainty` (ledger); `bayesianTrust` (trustMemory) |
| **Uncertainty-conditioned regulation** | letting that estimate change what the system does | **EXISTS AND IS CONSUMED.** `scoring.js:315` damps semantic terms in the decision score |
| **Self-assessment (metacognition)** | the system's estimate of how *reliable its own uncertainty estimate* is | **COMPUTED BUT NOT CONSUMED** — see §4 |

---

## 4. The genuine gap — computed but never consumed

Two functions are defined and exported, and **nothing reads them**:

| Function | Source | Consumers found |
|---|---|---|
| `getPredictionCalibration(pathKey)` | `uncertaintyEngine.js:194` | **none** — the only reference is `verify_G9.js:101`, an export-surface gate |
| `getGlobalUncertaintyPressure()` | `uncertaintyEngine.js:219` | **none** — not in `main.js`'s import list (`main.js:404–408` imports exactly three functions) |

`getGlobalUncertaintyPressure`'s own header states its intended role — *"drives overall exploration
vs exploitation"* — and that wiring **was never made**. `getPredictionCalibration` computes

```
calibration = (1 / (1 + sqrt(inconsistency))) * min(visits / 10, 1)
```

and no decision reads it.

**So the architecture estimates uncertainty, regulates on its magnitude, computes a self-assessment
of that estimate — and discards the self-assessment.** That asymmetry is the substantive gap, and it
is a fact about committed source, not an inference.

**A frozen result bears on this.** M7's G15 tested whether goal-reward *eligibility* is calibrated to
hidden per-edge reliability and returned **FAIL** (ρ Phase II `0.159945` against `|ρ| < 0.10`,
information sufficiency SATISFIED). A calibration failure at the reward layer is already on the
record, while the system's own calibration estimate sits unconsumed. **No causal link between the two
is asserted here**; M7 is frozen and D-010 §4's discipline applies.

---

## 5. Research question — two candidates, neither selected

> **UQ-A (regulation-ablation).** Does the existing uncertainty→decision-score pathway
> (`scoring.js:315`) make a measurable causal contribution to the structure of acquired
> representations, or is it inert?

> **UQ-B (self-assessment).** Does the system's computed self-assessment of its own uncertainty
> (`getPredictionCalibration`) track the realised reliability of its uncertainty estimates?

**OPEN — which question this track adopts.** §8 and §10 argue UQ-A is identifiable and UQ-B is at
serious degeneracy risk, but the choice is the Director's.

---

## 6. Competing hypotheses

Stated so that data could distinguish them, not so that one is favoured.

| | Hypothesis | Distinguishing prediction |
|---|---|---|
| **H0** | The uncertainty pathway is **inert**: removing it leaves acquired representations unchanged | Ablation produces no difference in the primary outcome |
| **H1** | The pathway is a **regulator**: it shapes which representations form, by damping semantic contributions under high uncertainty | Ablation changes representational structure |
| **H2** | The pathway is **cosmetic**: it changes decision scores but the changes are absorbed downstream (e.g. by arbitration or the anti-repeat swaps) before affecting representation | Decision scores differ under ablation; representational outcome does not |
| **H3** | The pathway is **miscalibrated**: it regulates, but its estimate does not track realised outcome variability, so regulation is driven by a signal with no referent | Regulation has an effect, and the estimate fails a calibration check |

**H2 is the hypothesis this architecture makes most likely to be overlooked**, because the decision
score is not the terminal quantity — `main.js:2594`/`2603` anti-repeat swaps and the arbitration
layer sit between it and the executed action.

---

## 7. Mechanism definition, and uncertainty representation

**Mechanism, as it exists.** Per-path-key state in `uncertaintyEngine`: `surpriseMap` (EMA of
`|actualReward − predictedReward|`, updated by `updateUncertainty(pathKey, predictedReward,
actualReward)`), `inconsistencyMap`, `visitCount`. Composed by `getUncertaintyScore` from surprise,
`sqrt(inconsistency)`, and a novelty pressure `1/sqrt(visits+1)`.

**Representation, as it exists.** The ledger maintains a **Beta-Bernoulli conjugate posterior** per
transition (`uncertaintyLedger.js:134`):

```
n = alpha + beta
mean        = alpha / n
variance    = (alpha * beta) / (n^2 * (n + 1))
uncertainty = min(2 * sqrt(variance), 1)
volatility  = 1 / (1 + n / 10)
```

with `OLLAMA_PRIOR_ALPHA = 1`, `PROPAGATION_F = 0.15`, `DECAY_RATE = 0.9995`, plus procedural and
semantic ledgers and `propagateUncertainty`. `trustMemory` independently maintains
`(successes + 1) / (attempts + 2)` — the Beta(1,1) posterior mean, the same family.

**Two distinct uncertainty representations already coexist**: a Beta posterior (ledger, trustMemory)
and a heuristic composite (engine). **Whether they agree, and whether that matters, is NOT
ESTABLISHED** and would itself be a legitimate narrower question.

---

## 8. Candidate mathematical formulations — no new formula invented

Assessed against what is already implemented. **The Director's instruction not to invent a novelty
formula is respected: no new formula appears in this document.**

| Framework | Already in the architecture? | Sufficient for UQ-A? | Sufficient for UQ-B? |
|---|---|---|---|
| Beta-Bernoulli conjugate posterior | **yes** — ledger `computeFields`, `trustMemory` | yes — no new math needed for an ablation | yes in principle |
| EMA prediction-error (surprise) | **yes** — `updateUncertainty` | yes | — |
| Heuristic composite score | **yes** — `getUncertaintyScore` | yes | — |
| Heuristic calibration | **yes** — `getPredictionCalibration` (unconsumed) | — | **degenerate risk**, §10 |
| Proper scoring rule (Brier / log score) for calibration | **no** | not needed | would be new — **OPEN**, and would need its own justification |
| Reliability-diagram binning | **no** | not needed | would be new, and introduces a binning choice — **OPEN** |

**UQ-A requires no new mathematics.** UQ-B requires either accepting the existing heuristic
calibration or importing a scoring rule, and the latter is a new analytical commitment that must be
frozen before data if it is adopted at all.

---

## 9. Novelty test

**Against MiniFlyWire's own implementation — the test that matters most here:**

| Proposition | Novel? |
|---|---|
| "Add uncertainty estimation" | **NO** — exists, two implementations |
| "Represent uncertainty as a Beta posterior" | **NO** — `computeFields`, `trustMemory` |
| "Let uncertainty modulate decisions" | **NO** — `scoring.js:315` |
| "Propagate / decay uncertainty" | **NO** — `propagateUncertainty`, `decayUncertaintyLedger`, `decayUncertainty` |
| "Compute a self-assessment of uncertainty" | **NO** — `getPredictionCalibration` |
| **"Establish whether the existing uncertainty pathway causally contributes to representation"** | **YES** — never tested |
| **"Consume the self-assessment in regulation"** | **YES as a change** — but that is implementation, not a question |
| "Test whether the two coexisting uncertainty representations agree" | **YES** — NOT ESTABLISHED |

**Against external theory:** Beta-Bernoulli epistemic uncertainty, EMA surprise as prediction error,
and uncertainty-modulated exploration are all standard. **This track claims no novelty in the
uncertainty formalism.** Its only novelty claim available is *the causal-contribution result*, which
is a fact about this architecture, not a contribution to uncertainty theory.

> **This is a deliberately deflationary novelty assessment.** Overstating it is the failure mode the
> vision's four conditions exist to prevent.

---

## 10. Identifiability analysis

Applying the D-010 discipline **before** proposing anything.

### UQ-A — identifiable

- **Exposure is set, not observed.** An ablation arm controls whether `uncertaintySemanticDamp`
  applies. The exposure is not a property of the data.
- **The substrate exists.** M7 already implemented arm switching (`experiments/m7/arms.js`, arms
  A1–A7 including ABLATION) with default-off `__M7_*` / `__MFW_*` guards and demonstrated
  bit-identical builds when unarmed.
- **Exposure and outcome need not share an object**, provided the outcome is representational rather
  than a re-read of the decision score. §11.
- **The counterfactual is observable** because it is *created*: the same configuration is run under
  both arms. This is precisely what U1 lacked.

### UQ-B — at serious degeneracy risk

`getPredictionCalibration` is computed from `inconsistencyMap` and `visitCount`. Any "realised
variability" outcome would plausibly be a transform of `inconsistencyMap` itself — **comparing a
quantity against a function of its own input.** That is the U1 §7.1 pattern.

> **OPEN — and the burden is on UQ-B.** Unless an outcome independent of `inconsistencyMap` and
> `visitCount` is identified, **UQ-B should be rejected**, exactly as U1's candidates were.

---

## 11. Minimal falsifiable experiment — sketch only

**Not a design. No seed range, tick budget, arm identifier, sample size or instrumentation is
proposed.**

Shape: a two-arm ablation, uncertainty regulation **ON** versus **OFF**, over paired configurations
run under both arms, with the primary outcome measured at the representational layer.

**Falsifiable statement candidate:** *"Acquired representational structure is identical under both
arms."* Refuted by any paired configuration whose primary outcome differs. Existence-form; **no
threshold is introduced.**

**OPEN:** everything else — number of arms, pairing rule, whether unarmed must be bit-identical
(strongly indicated by M7 precedent), and how ablation is expressed without modifying production
code.

---

## 12. Primary outcome candidates — OPEN, none selected

The vision directs this track to **representation, not behaviour**. Candidates, with the D-010 test
applied:

| Candidate | Layer | Shares a field with the exposure? |
|---|---|---|
| Q-table structure (`render/qlearning.js` — size, key set, value distribution) | representation | **appears not to** — the exposure is a scoring damp; Q is written by the learning path. **OPEN** |
| Semantic memory structure (`semanticMemoryLayer`, `schemaMemory`) | representation | the damp acts *on semantic terms* — **contamination risk, must be audited** |
| Episodic memory content (`episodeManager`, `episodic`) | representation | **OPEN** |
| Decision-score values | decision | **rejected** — it *is* the exposure |
| Executed action / goal reach | behaviour | **rejected** — D-010 established this layer is contaminated by `lastReasoning` |

**The semantic-structure candidate is the one most likely to be chosen carelessly and is the one most
at risk**, because `uncertaintySemanticDamp` multiplies exactly the semantic terms.

**Exactly ONE primary outcome must be selected and frozen before any data exists** (the D-006/D-009
discipline). This document selects none.

---

## 13. Confounds

1. **The scoring damp is not terminal.** Anti-repeat swaps (`main.js:2594`, `2603`) and the
   arbitration layer sit between the decision score and the executed action — hypothesis H2.
2. **Two uncertainty representations coexist** (§7) and may partially compensate under ablation.
3. **`decayUncertainty` / `decayUncertaintyLedger`** run on their own schedules; an ablation that
   suppresses reads but not updates differs from one that suppresses both. **OPEN which is intended.**
4. **`propagateUncertainty`** spreads uncertainty across neighbours (`PROPAGATION_F = 0.15`), so
   per-path exposure is not independent across paths.
5. **Single agent seed / single arm across M7–Q1.** Every prior phase used agent seed `20260819000`
   and arm `A1`; reuse buys comparability, not robustness.
6. **The imagination chain** (`STEPS` loop, `main.js:1492–2722`) applies the damp on every step while
   `lastReasoning` is written only on step 0 — the confound that killed U1's Candidate C.

---

## 14. Causal identification strategy

**Intervention, not observation.** The exposure is assigned by arm, so the comparison is between two
executions of the same configuration differing in one controlled switch. This satisfies vision
condition (3) in a way no observational design on this architecture can.

**Requirements, all OPEN in detail:** the ablation must be expressible without modifying production
code (M7's guarded-hook precedent), unarmed builds must be bit-identical, and the arm must change
exactly one pathway — verified by mutation control, not assertion.

**Causal language remains constrained.** A demonstrated ablation effect licenses *"removing this
pathway changes X"*. It does **not** license claims about why, about mechanism sufficiency, or about
any connection to the G15 outcome.

---

## 15. Minimum evidence, stopping rule, promotion criteria — all OPEN

**Minimum evidence: OPEN.** D-006 §4's lesson applies in advance: any minimum will be **Director
judgment**, not mechanically derivable, and must be labelled as such. Q1's realised yield (17 accepted
configurations from 500 seeds, against M8's 41) shows yield is not a stable planning constant.

**Stopping rule: OPEN.** The D-006 §5 form — fixed range, full enumeration, no extension, no
adaptation, pre-declared INCONCLUSIVE — is the established precedent and should be inherited unless
there is reason otherwise.

**Seed governance: OPEN.** Admissible space is strictly **below `899000`**. Consumed: Q1
`899000–899499`, M8 `899500–899999`, M7 `900000–900499`. Held-out `>= 900500` is never generated,
inspected or inferred. Nothing further is settled.

**Promotion criteria — a track is promoted from candidate to authorised only if all hold:**

1. A primary outcome exists that passes the §10 identifiability test and the §13 confound audit.
2. The novelty claim survives §9 — the result is not already implemented.
3. The falsifiable statement requires no threshold, or any threshold is frozen pre-data as Director
   judgment.
4. The ablation is expressible without modifying production code, with unarmed builds bit-identical.
5. An anti-vacuity plan exists in which corrupting the measurement input turns a named assertion red.
6. The ontology dependency in §2 is either discharged or explicitly waived.

---

## 16. GO / HOLD / NO-GO

> # HOLD

**Not GO**, because §1 and §9 establish that the broad track as named is largely already implemented,
and because no primary outcome has passed §10 and §13. Authorising now would repeat the M8 pattern of
committing to a measurement layer before its degeneracy was audited.

**Not NO-GO**, because a genuine, source-grounded, never-tested question does exist — **UQ-A**, the
causal contribution of the existing uncertainty pathway — and unlike U1 it is *identifiable by
construction*, since the exposure is assigned rather than observed and the architecture already
supports arm-based ablation.

**HOLD is released by one Director decision on three items:**

1. **Adopt UQ-A, adopt UQ-B, or neither.** §10 argues UQ-B carries a U1-shaped degeneracy risk and
   should be rejected unless an independent outcome is identified.
2. **Whether the ontology and hypothesis stubs (§2) must be populated first.** A programme-level
   dependency, outside this track's authority.
3. **Whether a representational primary outcome can be found that survives §12** — the single
   technical question that decides whether UQ-A is viable.

**If item 3 fails, the honest disposition is NO-GO**, on the same grounds as D-010: important, not
identifiable.

---

## 17. Adversarial self-audit

| Question | Answer |
|---|---|
| Did I invent a novelty formula? | **No.** §8 lists only frameworks already implemented; the two that would be new are marked OPEN and unrecommended. |
| Did I claim novelty for something already implemented? | **No.** §9 marks six propositions **NO** — including the whole surface of "add uncertainty-aware cognition". |
| Did I collect data, generate seeds, or run anything? | **No.** Source reading only. |
| Did I modify production code or the roadmap? | **No.** |
| Did I select an outcome? | **No.** §12 selects none and flags the most tempting one as the most contaminated. |
| Did I repeat U1's identifiability error? | **Checked explicitly.** §10 applies the D-010 test before proposing; UQ-B is flagged for rejection on exactly that ground. |
| Did I introduce a threshold or statistic? | **No.** |
| Did I guess where source was silent? | **No** — NOT ESTABLISHED and OPEN are used throughout. |
| Did I let a preferred answer drive the gate? | **HOLD, not GO**, despite a viable question existing. |

---

## 18. Process position

**Research → FORMULATION (here) → Independent Review (only if a genuine review gate is reached) →
Freeze → Implementation → Verification → Experiment → Interpretation.**

This document is the formulation. **No independent review has been requested and none should be until
the three §16 items are decided** — a reviewer cannot usefully assess a track whose question and
outcome are both still open.

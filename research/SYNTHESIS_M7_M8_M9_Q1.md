# Research Synthesis — M7 → M8 → M9 → Q1

**Prepared:** 2026-09-01 · **Author:** Chief Systems Engineer
**Audience:** Research Director and independent scientific review
**Basis:** committed artifacts only, at `21c7238`

> ## STATUS OF THIS DOCUMENT
>
> This is a **read-only state-of-knowledge audit**. It is explicitly:
>
> - **non-governing** — it authorises nothing and constrains nothing;
> - **not a pre-registration** and not a successor design;
> - **not a re-interpretation** of any frozen result;
> - **not a new analysis** — it computes no statistic, derives no new quantity, and touches no
>   evidence.
>
> Every figure is quoted from a committed artifact and attributed to it. Where this document and
> any frozen artifact disagree, **the frozen artifact governs and this document is wrong.**
>
> **No experiment was executed. No seed was generated or inspected. No new question is
> authorised.**

---

## 1. Chronology

| Phase | Frozen at | Outcome |
|---|---|---|
| M7 | `707cb1e` | **G15 FAIL** — a decided negative |
| M8 | `f9d97b9` | evidence sound; **analysis layer degenerate** |
| M9 | `04dda03` / `9044c3b` | secondary analysis over the M8 evidence, complete partition |
| Q1 | `d16d568` / `057ceb0` / `21c7238` | **INCONCLUSIVE — INSUFFICIENT MATERIAL**; two claims refuted |

---

## 2. M7

**Research question.** Whether MiniFlyWire maintains goal-reward eligibility calibrated to hidden
per-edge traversal reliability, at a pre-registered tolerance.

**Protocol.** `M7_PREREGISTRATION.md`, SHA-256 `2f12e309…f6b9`, with a cumulative erratum chain
M7-ERR-01 … M7-ERR-10.

**Evidence.** 41 accepted configurations; 26,143 goal-reach events; 3,000 ticks; agent seed
`20260819000`; arm `A1`; seeds evaluated inside `900030–900499`; 0 seeds at or above `900500`.

**Result (recorded at `ae45f20`, quoted unaltered).**

```
VERIFIER SELF-CHECK : GREEN      24 passed, 0 failed, exit 0
INFORMATION SUFFICIENCY : SATISFIED
GATE G15 : FAIL
```

| Measurement | Value | Requirement |
|---|---|---|
| Spearman ρ — Phase I | `0.007858` | \|ρ\| < 0.10 — within |
| Spearman ρ — Phase II | `0.159945` | \|ρ\| < 0.10 — **exceeds** |
| Accepted configurations | 41 | ≥ 20 · met |
| Distinct full `p_e` vectors | 17 | ≥ 10 · met |
| Distinct mean `p_e` values | 17 | ≥ 5 · met |

**What was falsified.** The calibration hypothesis at the frozen tolerance. The postmortem states
the supported conclusion exactly: *MiniFlyWire does not maintain goal-reward eligibility calibrated
to hidden per-edge traversal reliability at the frozen tolerance.* This is a **decided** negative —
information sufficiency was SATISFIED, so the gate had what it needed and returned FAIL.

**What was NOT established.**

- Any explanation of *why* calibration failed. G15 is a measurement outcome, not a mechanism.
- The G16.4(b) isolation property — *"No other `render/` file modified"* — retired by M7-ERR-10 as
  non-reproducible (filesystem-mtime referent). **No replacement measurement exists.** The
  postmortem records five claims as unsupported, including both "the isolation property holds" and
  "the isolation property is false".
- Any connection between the G15 outcome and any later phase.

---

## 3. M8

**Research question (frozen §1).** *"Under what mechanism does the action stored in `lastReasoning`
become desynchronized from the agent's state at the moment it is executed and evaluated, and what is
the relative contribution of each mechanism?"*

**Primary phenomenon (frozen §2).** `DESYNC := lastReasoning.from !== agentCurrent`, evaluated at
`main.js:3819`. Non-canonicality is explicitly **not** the primary phenomenon — it is a lossy,
topology-dependent consequence.

**Evidence collected.** Range `899500–899999`; 2,000 candidates; **41 accepted configurations**;
118,179 raw observation records; agent seed `20260819000`, arm `A1`, 3,000 ticks.

**Structural failure of the original analysis layer.** D-004 §2 records it plainly: *"The M8
analysis layer (§10, §11) is degenerate and is **not repaired and not superseded** — it stands in
history as issued and as demonstrated degenerate."* The defect was in the analysis, not the
collection.

**What remained learnable.** The raw evidence was sound and reproducible. D-004 authorised a
**separate** secondary analysis (M9) rather than an erratum, precisely so the M8 evidence and its
record stayed intact.

**What M8 established.** A reproducible, digest-pinned evidence base for the DESYNC phenomenon, and
the demotions later carried into M9: AGE is duration not a mechanism; replay is a constant
precondition; H4 is harness-unreachable; NON_CANONICAL is a consequence; `S_PAIR` is an observable
signature.

**What M8 did NOT establish.** Any mechanism attribution or relative contribution — the question it
was designed to answer. Its own analysis layer could not deliver it.

---

## 4. M9

**Repaired analytical question (D-004 §3, Candidate A).** The proportion of DESYNC events arising
from a teleport-class reset within the write→read gap, versus ordinary advance alone.

**ORIGIN definition (frozen M9 §4).**

```
ORIGIN = TELEPORT   if ticksSinceTeleport <  ticksSinceWrite
                    or (ticksSinceTeleport == ticksSinceWrite AND teleportSource == 'goalReset')
ORIGIN = ADVANCE    if ticksSinceTeleport >  ticksSinceWrite
                    or (equal AND teleportSource == 'cap' or 'pool')
ORIGIN = UNCLASSIFIED  if either input is null
```

**Result** (quoted from the committed `m9_results.json`; **M9's denominator, never Q1's**).

| | |
|---|---|
| Denominator | 7,178 DESYNC events, matching the frozen figure |
| ORIGIN | TELEPORT 2,281 (31.78%) · ADVANCE 4,897 (68.22%) · UNCLASSIFIED 0 |
| AGE | 1: 6,903 (96.17%) · 2: 256 · 3: 17 · 4: 2 |
| ADVANCE consequence | `nonCanonical` 4,897 (100%) · `sPair` 4,897 (100%) |
| TELEPORT consequence | `nonCanonical` 1,938 (84.96%) · `sPair` 0 (0%) |
| Precondition | `selectionRanThisTick` false on all 7,178 |
| H4 | count 0, status **UNTESTABLE UNDER THIS HARNESS** |

**Post-hoc limitation (M9 §9).** The ORIGIN rule was formulated **after** the M8 collection existed
and was retained knowing both categories were populated. M9's design is post-hoc relative to its own
evidence — a stronger limitation than Q1's, whose measurement was a-priori relative to its own
collection.

**What M9 genuinely established (§11).** The complete partition with zero unclassified residue; both
categories substantially populated; desynchronization overwhelmingly single-tick; deterministic
reproducibility from the frozen evidence.

**What M9 explicitly could NOT establish (§12).** M9 did **not** establish any of the following, and
none of them is claimed anywhere in this record: proximate causation for TELEPORT events; any causal
effect of goal degree or phase; **the number of advances inside a gap of age ≥ 2, or which teleport
was responsible when more than one occurred — only the most recent is retained**; that unobserved
cells are unreachable; anything about H4; **any connection to the M7 G15 outcome**; that replay is a
competing mechanism.

---

## 5. Q1 formulation — why it was necessary

The precise limitation Q1 addressed is **M9 §12.3**, quoted above, together with M9 §4's own
disclosure that *TELEPORT means "at least one teleport fell in the gap"*, not that it was the sole
or proximate transition.

Under M9's observable — a last-only, overwriting teleport counter yielding one boolean — the
histories `write→teleport→read`, `write→teleport→advance→read`, `write→advance→teleport→read` and
`write→teleport→advance→teleport→read` are **indistinguishable**; all four classify TELEPORT. Q1
§8 records this as the information gap it decomposes.

Q1 required a **new collection**: the ordered-transition observable was never recorded, so no
re-analysis of the M8 evidence could answer it.

---

## 6. Q1 collection

**Intended evidence.** The complete frozen range `899000–899499` — 500 seeds × 4 goal indices =
2,000 candidates — sized from M8's documented yield of 41 accepted configurations from 500 seeds.

**Actual evidence.** 2,000 candidates enumerated; **17 accepted configurations**, drawn from **9
distinct configuration seeds**; 1,983 rejected; none pending, none failed; 37,659 assignment records
and 97,810 boundary records.

**INCONCLUSIVE reason.** Three of four D-006 §1 E minima unmet:

| Condition | Required | Observed |
|---|---:|---:|
| accepted configurations | 20 | **17** |
| configurations `degree5` | 15 | **9** |
| configurations `degree3` | 15 | **8** |
| DESYNC events pooled | 100 | 3,166 (met) |

**No-sampling consequence.** D-006 §5 forbids extension, substitution, retry and post-hoc
adaptation. The complete registered range was processed and the pre-declared disposition applied.
D-007 §8 and D-009 §10 keep that prohibition in force.

---

## 7. Q1 analysis

**Transition definition (D-009 Ruling 1).** For claim evaluation a transition is a record with
`fromPos !== toPos`, per Q1 §6 ("position-changing") and §15.6 ("realised position changes only").

**Results** (from the committed `q1_claim_results.json`; Q1's own denominator of 3,166 DESYNC gaps —
ADVANCE 2,086, TELEPORT 1,080, UNCLASSIFIED 0):

| | Frozen statement | Verdict | Counterexamples |
|---|---|---|---:|
| **E1** | TELEPORT-classified gaps contain only teleports | NOT REFUTED | 0 |
| **E2** | Every gap contains exactly one transition | **REFUTED** | **85** |
| **E3** | The last transition in a TELEPORT-classified gap is always the teleport | NOT REFUTED | 0 |
| **E4** | `FIRST_DIVERGING_TRANSITION` always equals `LAST_TRANSITION_BEFORE_EVALUATION` | **REFUTED** | **85** |
| **E5** | ADVANCE-classified gaps are single-transition | NOT REFUTED | 0 |

**E4 ≡ E2.** Under D-009 Ruling 2, "equals" is record identity; first and last differ exactly when a
gap holds more than one transition. Verified per gap: agreement on all 3,166, 0 disagreements, and
the refuting sets are the same 85 gaps. **Four distinct propositions were evaluated, not five.**

**E5 structural constraint.** `ORIGIN=ADVANCE` means the most recent teleport predates the write, so
no `cap`, `pool` or `goalReset` record can lie in the window. That ADVANCE gaps contain only
advances is **entailed by the classification rule**. The empirical residue is only that no ADVANCE
gap contained two or more `advance` transitions.

**Self-loop treatment.** 2,686 self-loop assignment records (`advance` 2,086, `goalReset` 600)
excluded from claim evaluation under D-009; **222 fell inside gap windows and changed the transition
counts of 202 gaps** — material, not cosmetic. All records retained unaltered in the raw evidence.

**Scope fact.** In the Q1 gap population, TELEPORT-classified gaps contained **only `goalReset`**
transitions; `cap` and `pool` appear in the collected evidence but fell inside **no** DESYNC gap.

---

## 8. Q1 interpretation — what it permits and prohibits

**Permits:** stating E2/E4 as REFUTED by 85 observed counterexamples; stating E1/E3/E5 as NOT
REFUTED with the mandated wording *"no counterexample observed in 17 accepted configurations drawn
from 9 distinct configuration seeds"*; reporting the self-loop accounting; reporting
`originSensitivity = 0` as a dataset-specific robustness check; stating that Q1 characterises a
phenomenon also present in the M7 evidence and provides a more precise basis for future
investigation.

**Prohibits:** any proportion, rate, prevalence, percentage or frequency derived from Q1; dividing
85 by 3,166 or anything else; any causal statement, including "proximate cause"; describing E1, E3
or E5 as proven, true, confirmed, established or holding; presenting E4 as an independent finding;
presenting E5 as an ordinary empirical discovery; claiming Q1 explains, or identifies the mechanism
behind, G15; pooling Q1's denominator with M8, M9 or any future evidence.

---

## 9. Three categories of knowledge

The test applied to every entry: **"Could this have been true even if the observed data were
different?"** If yes, it is structural, not empirical — regardless of who called it a finding.

### A. Empirically established / directly observed

| | Statement | Source |
|---|---|---|
| A1 | Phase II eligibility shows dependence on `p_e` above the frozen bound: ρ = `0.159945` vs \|ρ\| < 0.10, on 41 configurations with information sufficiency SATISFIED | M7 `ae45f20` |
| A2 | The 7,178 M8 DESYNC events partition completely under ORIGIN with zero unclassified residue, both categories populated | M9 |
| A3 | DESYNC in the M8 evidence is overwhelmingly single-tick (96.17% at age 1) | M9 |
| A4 | `selectionRanThisTick` is false on all 7,178 M9-eligible events — a constant precondition | M9 |
| A5 | **A DESYNC gap can contain two or more position-changing transitions** — 85 counterexamples | Q1 (E2/E4) |
| A6 | In the Q1 gap population, TELEPORT-classified gaps contained only `goalReset`; `cap` and `pool` fell inside no gap | Q1 |
| A7 | The ordered transition sequence inside the write→read gap is observable losslessly, in order, and run-neutrally | Q1 instrumentation, 86/0 |
| A8 | The §4 transition taxonomy is complete: every reachable `agentCurrent` assignment is accounted for | Q1 §5 gate |

A1 and A5 are refutations — valid at any sample size. A2–A4 are M9 observations on M9's denominator.
A6 is scoped to the Q1 population and is **not** a statement of impossibility. A7 and A8 are
engineering properties independent of sample size.

### B. Not refuted, but weakly supported

| | Statement | Strength |
|---|---|---|
| B1 | No counterexample to E1 (TELEPORT gaps contain only teleports) | 9 distinct seeds; TELEPORT class realised by one mechanism only |
| B2 | No counterexample to E3 (last transition in a TELEPORT gap is the teleport) | same scope as B1 |
| B3 | No counterexample to the empirical residue of E5 (no ADVANCE gap held two or more advances) | 9 distinct seeds; the rest of E5 is structural (C3) |

**None of B1–B3 is evidence that the statement is true.** All three carry the INCONCLUSIVE
disposition. Effective independence is 9, not 17.

### C. Structural / logical consequences — true regardless of the data

| | Statement | Why structural |
|---|---|---|
| C1 | E4 is logically equivalent to E2 | D-009 Ruling 2: record identity; first ≠ last iff count ≥ 2 |
| C2 | Every DESYNC gap contains at least one position-changing transition | DESYNC means the position changed; position changes only at the four sites |
| C3 | ADVANCE-classified gaps contain only `advance` transitions | `ORIGIN=ADVANCE` places the last teleport before the write |
| C4 | In M9, ADVANCE events are 100% `sPair` and 100% `nonCanonical` | M9 §11.5: *"behaves exactly as its definition entails"* |
| C5 | A fresh selection is never desynchronized | M9 §3 fact G1 |
| C6 | `originSensitivity = 0` is dataset-specific | a robustness check on one dataset, not a general equivalence |

**C4 is the clearest cautionary case in the record:** M9 itself labelled it a confirmation of
implementation correctness, not a mechanism finding. C3 is the second: it makes E5's NOT REFUTED
materially weaker than the words suggest.

---

## 10. Claim ledger

| Claim | Source milestone | Evidence | Status | Strength | Limitation |
|---|---|---|---|---|---|
| Goal-reward eligibility is calibrated to hidden `p_e` at the frozen tolerance | M7 | 41 configs, ρ Phase II `0.159945` | **REFUTED** | decided negative, sufficiency SATISFIED | tolerance-relative; no mechanism identified |
| `render/` isolation during M7 (G16.4b) | M7 | none reproducible | **UNEVALUABLE** | — | measurement retired by ERR-10; no replacement |
| Mechanism attribution for DESYNC, with relative contributions | M8 | 118,179 records | **UNEVALUABLE** | — | analysis layer degenerate; stands unrepaired |
| DESYNC events partition completely under ORIGIN | M9 | 7,178 events | **OBSERVED** | complete, 0 unclassified | M9's denominator only |
| TELEPORT share 31.78% / ADVANCE 68.22% | M9 | 7,178 events | **OBSERVED** | descriptive | post-hoc rule; no causation; not Q1's population |
| DESYNC is overwhelmingly single-tick | M9 | 6,903 of 7,178 at age 1 | **OBSERVED** | descriptive | M9's denominator only |
| ADVANCE events are `sPair` and `nonCanonical` | M9 | 4,897 events | **STRUCTURAL** | entailed by definition | not a mechanism finding |
| Replay is a competing mechanism | M9 | constant `false` | **UNEVALUABLE** | — | a precondition, not an explanation |
| Goal-context mismatch (H4) | M8 / M9 | count 0 | **UNEVALUABLE** | — | harness-unreachable; untestable ≠ absent |
| Every DESYNC gap contains exactly one transition | Q1 (E2) | 85 counterexamples | **REFUTED** | valid at any sample size | 85 is existence evidence, never a rate |
| `FIRST_DIVERGING` always equals `LAST_TRANSITION` | Q1 (E4) | same 85 gaps | **REFUTED** | — | **logically equivalent to E2** |
| TELEPORT gaps contain only teleports | Q1 (E1) | 0 counterexamples | **NOT REFUTED** | weak — 9 seeds | TELEPORT realised only as `goalReset` |
| Last transition in a TELEPORT gap is the teleport | Q1 (E3) | 0 counterexamples | **NOT REFUTED** | weak — 9 seeds | same scope as E1 |
| ADVANCE gaps are single-transition | Q1 (E5) | 0 counterexamples | **NOT REFUTED** + **STRUCTURAL** | weak; partly entailed | only the "≥2 advances" half is empirical |
| Gap composition is independent of AGE | Q1 (§9.5) | none | **UNEVALUABLE** | — | retired by D-007 §4; no decision rule at any *n* |
| Distribution of gap composition | Q1 | 17 configs / 9 seeds | **INCONCLUSIVE** | below every minimum | D-006 §5 forbids more sampling under Q1 |
| `cap` / `pool` can occur inside a DESYNC gap | Q1 | 0 observed in gaps | **UNKNOWN** | absence in one population | not impossibility in the harness |
| DESYNC has a behavioural consequence | — | none | **UNKNOWN** | never measured | excluded by design (Q1 §15.2) |
| DESYNC relates to the G15 outcome | — | none | **UNKNOWN** | no evidence either way | no causal arrow permitted |

---

## 11. M7 / G15 — the separation, stated exactly

**FACT.** Q1 characterises DESYNC. DESYNC was present in the M7 runtime. G15 failed.

**NOT ESTABLISHED — none of the following is claimed anywhere in this record, and each is
explicitly disclaimed:** that Q1 explains G15; that DESYNC caused the G15 FAIL; that Q1 identifies
the mechanism behind G15.

M9 §10 states the same separation and records that M9 used **no M7 quantity** — ρ, reward,
eligibility and calibration appear nowhere in its analysis. Q1 §15.3 carries the same exclusion.
**Three facts may be stated side by side; no causal arrow may be drawn between them.**

---

## 12. What genuinely remains unknown

Only questions unresolved *after* Q1, each with what is missing and whether answering it would
reduce uncertainty.

### U1 — Does DESYNC have any behavioural consequence?

1. **Why current evidence cannot answer it.** No phase has ever measured one. Q1 §15.2 excludes it
   by design; M9 measured `nonCanonical` and `sPair`, which are *signatures* of desynchronization,
   not consequences of it.
2. **Missing information.** A pre-specified outcome measure over executed behaviour, recorded
   alongside the DESYNC predicate on the same runs.
3. **Kind.** **Observational** first — the substrate may already exist, since the M7 StepLedger
   already records support from executed behavioural commitments independently of environment
   realisation. Experimental only if a manipulation is later authorised.
4. **Would it reduce uncertainty?** **Decisively.** Every result so far describes DESYNC's internal
   structure. None establishes that it matters. This is the question whose answer changes what all
   the preceding work *means*.

### U2 — What is the distribution of gap composition?

1. **Why unanswerable.** Q1 is INCONCLUSIVE: 17 configurations from 9 distinct seeds, below every
   configuration minimum. D-006 §5 forbids more sampling under Q1.
2. **Missing.** Sufficient independently sampled material.
3. **Kind.** Observational, requiring a new collection under a new pre-registration.
4. **Would it reduce uncertainty?** Partly. It completes a description. It inherits Q1's post-hoc
   baggage, and C3 means a substantial part of what it would report about ADVANCE gaps is entailed
   rather than measured.

### U3 — Is the acceptance yield a stable property of the predicate?

1. **Why unanswerable.** Two blocks yielded differently: 41 accepted from 500 seeds (M8) versus 17
   from 500 (Q1). No phase investigated why.
2. **Missing.** An analysis of the acceptance predicate's behaviour across seed space; `G11` was
   cited in 1,982 of Q1's 1,983 rejections.
3. **Kind.** **Analytical** — no new collection is strictly required.
4. **Would it reduce uncertainty?** Methodologically yes, scientifically little. It would make any
   future study sizeable with confidence, which Q1 was not.

### U4 — Can `cap` or `pool` occur inside a DESYNC gap?

1. **Why unanswerable.** Neither appeared inside any Q1 gap. Absence in one population is not
   impossibility.
2. **Missing.** Either a source-level reachability proof or a population in which they occur.
3. **Kind.** Analytical (source proof) or observational.
4. **Would it reduce uncertainty?** Narrowly. It would fix the scope of E1 and E3, which are already
   weak.

### U5 — Is the ORIGIN partition valid a-priori?

1. **Why unanswerable.** M9's rule was formulated after its evidence existed; Q1 applied the rule but
   did not test it a-priori.
2. **Missing.** A new experiment with the rule frozen before collection — M9 §13's own observation.
3. **Kind.** Experimental.
4. **Would it reduce uncertainty?** Limited. C3 and C4 show much of ORIGIN's behaviour is entailed by
   its own definition; an a-priori test would substantially re-verify a definition.

### U6 — Is goal-context mismatch (H4) real?

1. **Why unanswerable.** Structurally untestable: both in-tick goal-write sites are gated on
   `window.homeNeuronId`, never defined in the headless harness.
2. **Missing.** A harness in which that identifier is defined.
3. **Kind.** Experimental, requiring harness modification — an intervention.
4. **Would it reduce uncertainty?** Only if H4 matters, which no evidence currently suggests. M8
   demoted it and M9 recorded it as untestable, not absent.

---

## 13. Candidate next questions — ranked, none authorised

Ranked on: information gain · ability to distinguish competing explanations · minimal intervention ·
identifiability · independence from existing post-hoc choices · falsifiability · reproducibility ·
cost · risk of another vacuous analysis.

| Rank | Candidate | Gain | Distinguishes | Intervention | Independence from post-hoc choices | Vacuity risk |
|---:|---|---|---|---|---|---|
| **1** | **U1** — does DESYNC have a behavioural consequence? | **highest** | yes: benign artifact vs behaviourally material | observational; substrate may exist | **high** — predates every Q1 partition choice | moderate — needs a pre-specified outcome measure |
| 2 | U3 — is the acceptance yield stable? | methodological | no | none; analytical | high | low |
| 3 | U2 — distribution of gap composition | moderate | no | new collection | **low** — inherits Q1's baggage | moderate — C3 entails part of it |
| 4 | U4 — can `cap`/`pool` occur in a gap? | narrow | weakly | none or small | high | low |
| 5 | U5 — a-priori ORIGIN test | limited | no | full new experiment | moderate | **high** — largely re-verifies a definition |
| 6 | U6 — H4 under a modified harness | speculative | no | **harness modification** | high | high — tests a demoted mechanism |

**Recommended as the strongest possible next question — for the Director's consideration only:**

> **U1 — Does decision/position desynchronization have any measurable consequence for executed
> behaviour?**

**Why it ranks first.** It is the only candidate whose answer changes the meaning of the entire M7 →
Q1 record rather than adding detail to it. It distinguishes two live and opposed readings that the
existing evidence cannot separate: that DESYNC is a benign bookkeeping artifact of the
write/read seam, or that it is behaviourally material. It carries **none** of Q1's post-hoc partition
baggage, because it was never asked and no ruling has scoped it. It requires no manipulation to make
a first cut. And it is falsifiable in the plain sense: a pre-specified outcome measure either differs
between DESYNC and non-DESYNC executions or it does not.

**The risk that must be designed against, if it is ever authorised.** The outcome measure must be
frozen before any data is seen. M8's analysis layer went degenerate precisely because its
classification was specified loosely; a "consequence" measure chosen after the fact would repeat
that failure exactly. **This document proposes no such measure and designs no experiment.**

---

## 14. Adversarial self-audit

| Question | Answer |
|---|---|
| Did I turn a non-refutation into support? | No. B1–B3 are labelled NOT REFUTED, weak, with the seed count attached. The words proven, true, confirmed, established and holds appear nowhere as a verdict. |
| Did I turn a structural entailment into a discovery? | No. C1–C6 are separated explicitly, including M9's ADVANCE/`sPair` result, which M9 itself called a confirmation of implementation correctness. E5 is split across B3 and C3. |
| Did I introduce a statistic? | No. Every number is quoted from a committed artifact. No new ratio, rate, test, interval or model. |
| Did I introduce causal language? | No. The only causal terms appear inside explicit prohibitions (§11). |
| Did I pool incompatible denominators? | No. M9's 7,178 and Q1's 3,166 are always labelled with their study and never combined. |
| Did I silently repair a frozen protocol? | No. M8's degenerate analysis layer, G16.4b's retirement and Q1 §9.5's retirement are all reported as standing unrepaired. |
| Did I use knowledge of the Q1 result to formulate a supposedly historical claim? | No. §2–§4 are sourced from artifacts frozen before Q1 existed. U1 is a question none of the phases asked, not a retrofit. |
| Did I invent any fact not supported by the committed artifacts? | No. Every figure traces to `m9_results.json`, `q1_claim_results.json`, the M8/Q1 manifests, the frozen pre-registrations, the decision log, or the M7 postmortem. |

---

## 15. State of the record

**Frozen and closed:** M7 at `707cb1e` · M8 evidence at `f9d97b9` · M9 at `04dda03`/`9044c3b` · Q1 at
`d16d568`/`057ceb0`/`21c7238` · decisions D-001 through D-009.

**Two questions were asked and answered by refutation:** M7's calibration hypothesis, and Q1's E2/E4.
**Two were asked and could not be answered:** M8's mechanism attribution (degenerate analysis layer)
and Q1's distributional half (insufficient material). **One was retired as unanswerable at any sample
size:** Q1 §9.5.

**The most useful thing this record establishes is negative and methodological:** three separate
failure modes — a non-reproducible measurement referent (G16.4b), a degenerate analysis layer (M8),
and a claim with no decision rule (Q1 §9.5) — were each caught, recorded, and left unrepaired rather
than quietly fixed. That discipline is the project's most transferable asset.

**No new experiment is authorised by this document.**

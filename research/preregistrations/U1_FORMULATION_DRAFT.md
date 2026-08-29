# U1 — Formulation Draft

**Prepared:** 2026-09-03 · **Author:** Chief Systems Engineer
**Status:** **DRAFT FORMULATION — NOTHING HERE IS FROZEN**
**Basis:** committed artifacts at `33e0c9f`

> ## STATUS OF THIS DOCUMENT
>
> This is a **formulation draft**. It is explicitly:
>
> - **not a pre-registration** — no parameter in it is frozen;
> - **not an experiment design** — no seed range, tick budget, arm or sample size is proposed;
> - **not an authorisation** — it authorises nothing;
> - **not an analysis** — no data was inspected and no quantity was computed.
>
> Unresolved decisions are labelled **UNRESOLVED** throughout. Where the committed source does not
> establish something, this document says **NOT ESTABLISHED** rather than guessing.
>
> **No experiment was executed. No seed was generated or inspected. No existing raw data was
> analysed.**

---

## 1. The question, and what is wrong with it as stated

> **U1: Does decision/position desynchronization have any measurable consequence for executed
> behaviour?**

Two words are doing unearned work.

**"Consequence"** implies causation. A causal consequence requires a counterfactual — what the
outcome would have been had DESYNC not occurred on that same occasion — and §6 establishes that the
available substrate cannot observe it. **U1 must be formulated as a behavioural association
question, not a causal one.**

**"Behaviour"** is not self-defining in this system. §3 decomposes it.

---

## 2. What M7–Q1 established, and what remains unknown

**Established.** M7: goal-reward eligibility is not calibrated to hidden `p_e` at the frozen
tolerance (G15 FAIL, a decided negative). M9: the 7,178 M8 DESYNC events partition completely under
ORIGIN, overwhelmingly single-tick. Q1: a DESYNC gap can contain two or more position-changing
transitions (E2/E4 refuted, 85 counterexamples); the ordered gap sequence is observable losslessly
and run-neutrally.

**Unknown.** Whether DESYNC has any observable consequence at any layer downstream of itself. No
milestone has measured one. M9's `nonCanonical` and `sPair` are **signatures of** DESYNC, not
consequences of it; Q1 §15.2 excluded behavioural consequence by design.

---

## 3. What "behaviour" means here — the layer decomposition

The committed source distinguishes five layers. `main.js:4893–4895` names four of them in one place:
*"the realised position, the selected action, the executed action, and the environment's verdict on
it."*

| Layer | Concretely | Source | Downstream of DESYNC? |
|---|---|---|---|
| L1 internal state transition | `agentCurrent` assignments at `3163`, `3274`, `4731`, `4917` | Q1 §4 | **This is where DESYNC lives** — not downstream |
| L2 decision / commitment | `lastDecision.best` (set `2397`), `lastReasoning` (written `2635`) | main.js | Upstream of the read; not downstream |
| L3 executed action | `_m7To = next` at `4886`; the action actually executed | main.js `4885–4886` | **Downstream** of the read at `3819` |
| L4 environmental realization | `_m7Traversed = _m7env.attempt(_m7From, _m7To)` at `4888–4890` | main.js, `env.attempt` | **Downstream** — but see §7, degenerate |
| L5 subsequent feedback | `rewardSignal`, `episodeUnique >= 3` eligibility (`3917–3925`), episode sealing | main.js | **Downstream** |

DESYNC status is fixed at the read, `main.js:3819`. **Only L3, L4 and L5 are strictly downstream of
it.** Any U1 outcome must live in one of those three.

---

## 4. StepLedger audit

Source-only. Nothing was modified, and no quantity was computed from it.

| # | Question | Finding |
|---|---|---|
| 1 | What does it record? | Per entry: `{from: _m7From, intent: lastDecision.best.key or null, attempted: _m7To, outcome: _m7Traversed}` — `main.js:4899–4903` |
| 2 | When? | `main.js:4897`, guarded by `__MFW_STEP_LEDGER__ && next !== null && !_goalResetJustHappened`. **After** the read (`3819`) and the evaluation (`3922`); **before** the advance (`4917`) |
| 3 | Scientific meaning | Per its ruling header: trajectory support = **distinct executed behavioural commitments**, independent of whether the environment realised each. `attempted` is counted whether the traversal succeeds or slips; `outcome` is kept separate |
| 4 | Downstream of DESYNC? | **Yes** — `4897 > 3819` in the audited in-tick order |
| 5 | Unambiguous pairing with DESYNC? | **Partly.** One read per tick and at most one ledger entry per tick, so a per-tick pairing exists. But the entry is **skipped** when `next === null` or `_goalResetJustHappened`, so some DESYNC reads have no paired entry. Any use must define that exclusion explicitly |
| 6 | Executed behaviour or internal commitment? | **Both, in separate fields.** `attempted` is executed action (L3); `outcome` is environmental realization (L4); `intent` is commitment (L2) |
| 7 | Meaningful DESYNC vs non-DESYNC comparison? | The comparison population exists in principle — Q1 recorded both DESYNC and non-DESYNC reads — but **the outcome fields themselves are subject to §7's degeneracy finding** |
| 8 | Assumptions not already established? | **Yes, a disqualifying one.** See below |
| 9 | Observable independently of the DESYNC classifier? | **Yes** for the underlying fields: `_m7From`, `_m7To`, `_m7Traversed` are computed at `4885–4890` **regardless of the guard**. A read-only probe could record them without arming the ledger |

### 4.1 The disqualifying finding: the StepLedger is not a neutral observer

`main.js:3917–3919`:

```js
const episodeUnique = globalThis.__MFW_STEP_LEDGER__
    ? _mfwTrajectorySupport()
    : new Set(recentMemory.map(Number)).size;
```

**Arming `__MFW_STEP_LEDGER__` changes how reward eligibility is computed**, and eligibility gates
`rewardSignal` at `3923–3925`. The ledger is a *cognitive-architecture feature*, not an experiment
hook — its own header says so, and names the guard `__MFW_` for that reason.

**Consequence for U1.** Using the ledger's `support` aggregate as an outcome requires arming a guard
that **modifies the agent under study**. That is an intervention, not an observation, and it breaks
the instrumentation-neutrality discipline every prior phase held (Q1 §11; M8 §15).

**What survives.** The ledger's *fields* are recordable neutrally, because `_m7From`, `_m7To` and
`_m7Traversed` are computed at `4885–4890` independently of the guard. **The aggregate is not
usable; the fields are.** This distinction is the audit's main structural result and is
**UNRESOLVED** only in the sense that any future design must respect it, not evade it.

---

## 5. Candidate operationalizations

### Candidate A — environmental realization (slip vs success)

*Exposure:* DESYNC at the read. *Outcome:* `_m7Traversed` on the same tick. *Unit:* the tick.

**REJECTED — structurally degenerate. See §7.1.** Recorded because rejecting it before any data
exists is the point of this milestone.

### Candidate B — StepLedger trajectory support / eligibility

*Exposure:* DESYNC. *Outcome:* `_mfwTrajectorySupport()`, or `episodeUnique >= 3`.

**REJECTED — requires an intervention.** §4.1: computing it requires arming a guard that changes
eligibility and therefore `rewardSignal`. The observation would alter the phenomenon it observes.

### Candidate C — intent ↔ executed-action divergence

*Exposure:* DESYNC at the read. *Outcome:* whether `intent` (`lastDecision.best.key`) and
`attempted` (`_m7To = next`) designate the same target. *Unit:* the tick.

**UNRESOLVED — a prerequisite is NOT ESTABLISHED.** `lastDecision` is assigned at `main.js:2397`,
inside the same selection pass that writes `lastReasoning` at `2635`. Under DESYNC no fresh selection
ran that tick (M9: `selectionRanThisTick` is `false` on all 7,178 eligible events), so both fields
are stale **from the same pass**. Whether `intent` and `attempted` are therefore **equal by
construction** is **NOT ESTABLISHED** from the source read for this audit — they are different fields
of possibly different types (`best.key` versus a node id). **If they are equal by construction the
candidate is degenerate and must be rejected.** Settling this requires a source audit, not data.

### Candidate D — episode termination mode

*Exposure:* DESYNC incidence within an episode. *Outcome:* whether the episode terminates by goal
reach (`goalReset`, `main.js:4731`) or by the episode cap (`cap`, `main.js:3163`, `EPISODE_CAP =
150`). *Unit:* **the episode**, not the tick.

**STRONGEST SURVIVING CANDIDATE, with an undischarged concern.** Both termination modes are already
members of Q1's frozen §4 taxonomy, so both are directly observable with no reconstruction. The
episode unit sidesteps the per-tick pairing problem in §4 item 5.

**The undischarged concern.** `goalReset` transitions appear *inside* DESYNC gaps — Q1 observed that
TELEPORT-classified gaps were composed exclusively of `goalReset`. Exposure and outcome may
therefore share an underlying field. Whether an episode-level exposure defined to **exclude the
terminating transition itself** breaks that sharing is **UNRESOLVED** and is the single most
important question for independent review.

### Candidate E — reward-eligibility outcome at the evaluation

*Exposure:* DESYNC. *Outcome:* the reward branch taken at `main.js:3922–3925`. *Unit:* the tick.

**VIABLE BUT WEAKER.** Observable without arming the ledger (unarmed, `episodeUnique` reads
`recentMemory`). But the outcome depends on `episodeUnique`, which is the very quantity Candidate B
must not touch, so the two candidates interact and the interaction is **UNRESOLVED**.

---

## 6. Counterfactual audit — mandatory

For every candidate the comparison is: *"what is the outcome on occasions where DESYNC is present,
versus occasions where it is absent?"*

That is **not** the counterfactual *"what would the outcome have been on this occasion had DESYNC not
occurred?"* The substrate observes each tick once, in one state. **The counterfactual is not
observable.**

**Therefore: causal interpretation is prohibited for every candidate in §5, without exception.** No
candidate may be reported as showing that DESYNC *causes*, *produces*, *leads to* or *is responsible
for* any outcome. The permissible form is an **association between a classification and a
co-recorded outcome**, and Q1 §7's ban on "proximate cause" carries forward unchanged.

**This prohibition is not a limitation to be lifted by a larger sample.** It is a property of the
observational design and would only change under a design that manipulates DESYNC directly — which
no candidate here proposes and which this document does not recommend.

---

## 7. Degeneracy audit

### 7.1 Candidate A is degenerate — the decisive source finding

`experiments/m7/env.js`:

```js
export function attempt(fromId, toId) {
  if (!ENABLED || !ACTIVE) return true;
  const p = pFor(fromId, toId);
  if (p === null) return true;        // unknown edge: unchanged behaviour
  ...
}
function pFor(fromId, toId) {
  const i = EDGE_OF.get(KEY(Number(fromId), Number(toId)));
  if (i === undefined) return null;   // not a graph edge
  ...
}
```

**If the attempted pair is not a graph edge, `attempt` returns `true` unconditionally — no RNG draw,
no counter increment, no possibility of a slip.**

And `main.js:4885` sets `_m7From = agentLast`, with `agentLast = agentCurrent` assigned
unconditionally at `4837`, before it.

M9 recorded that ADVANCE-classified DESYNC events were **100% `nonCanonical`** (4,897 of 4,897) and
**100% `sPair`** — the attempted pair was `(agentCurrent, agentCurrent)`, never a graph edge.

**Therefore, on every event in the `sPair` class — which M9 recorded as 100% of ADVANCE-classified
DESYNC events, 4,897 of 4,897 — `outcome` is `true` by construction and the environment is bypassed
entirely: no draw is taken and no slip is possible.** On those events `outcome` is fixed by the
non-canonicality that M9 recorded as co-occurring with DESYNC, not by any environmental draw. **No
causal relation between DESYNC and non-canonicality is asserted here; the relation used is
co-occurrence recorded by M9 together with the source behaviour of `pFor` and `attempt`.** Candidate
A would reproduce the M8 failure mode exactly: an outcome mechanically implied by the exposure.

**This is the most valuable result of this milestone — a candidate eliminated on source grounds,
before any data existed.**

### 7.2 The audit questions, applied

| Question | A | B | C | D | E |
|---|---|---|---|---|---|
| Outcome algebraically determined by DESYNC? | **YES** | no | **UNRESOLVED** | UNRESOLVED | no |
| `DESYNC ⇒ outcome` true by construction? | **YES**, for the sPair class | no | UNRESOLVED | no | no |
| Exposure and outcome share an underlying field? | yes (`agentCurrent`) | no | possibly (same stale pass) | **possibly** (`goalReset`) | no |
| Comparison population could be empty? | no | no | no | **UNRESOLVED** | no |
| Every observation could receive the same outcome? | **YES** | no | possibly | no | no |
| Outcome merely restates DESYNC? | effectively | no | possibly | no | no |
| Requires an intervention? | no | **YES** | no | no | no |

---

## 8. Identifiability

| Quantity | Directly observable? | Requires reconstruction? | Unique? | Assumption required? |
|---|---|---|---|---|
| DESYNC at `3819` | **yes** — `lastReasoning.from !== agentCurrent` | no | yes, one per read | none beyond M8 §2 |
| `_m7To` (executed action) | **yes**, `main.js:4886` | no | one per tick | none |
| `_m7Traversed` (env verdict) | **yes**, `4888–4890` | no | one per tick | **degenerate**, §7.1 |
| `intent` (`lastDecision.best.key`) | **yes**, `2397` | no | one per selection pass | staleness pairing **UNRESOLVED** |
| StepLedger `support` | **no** — requires arming the guard | n/a | n/a | **changes eligibility** |
| Episode termination mode | **yes** — `cap` / `goalReset` are Q1 §4 taxonomy members | no | one per episode | episode delimitation **UNRESOLVED** |
| Reward branch at `3922` | **yes** | no | one per tick | interacts with `episodeUnique` |

**No candidate that survives requires a lossy reconstruction of the kind M9's ORIGIN emulation
needed.** Candidates A, C, D and E are all directly observable; the rejections in §5 are for
degeneracy and intervention, not for identifiability.

---

## 9. Temporal ordering

Fixed by the audited in-tick order, unchanged from Q1 §3:

```
3163 / 3274  <  2635  <  3819  <  3922  <  4731 / 4885–4897 / 4917
cap / pool       write     read     eval     goalReset / ledger fields / advance
```

- **DESYNC status is established at `main.js:3819`**, once per read.
- **Any U1 outcome must be measured at a site strictly after `3819`** — `3922`, `4731`, `4885–4897`
  or `4917`.
- **"The same event"** — **UNRESOLVED**. For a tick-unit candidate the natural definition is one
  read and the records following it within the same tick, before the next `runAgent` entry. For an
  episode-unit candidate it is the span between two consecutive episode resets. Both must be frozen
  before collection.
- **Multiple transitions in a gap** — Q1 established these occur (E2 refuted, 85 counterexamples).
  Any tick-unit pairing rule must state its behaviour explicitly. **UNRESOLVED.**
- **No behavioural commitment exists** (`next === null`, or `_goalResetJustHappened`) — the ledger
  site is skipped. Such ticks must be an **explicit, counted, reported exclusion**, never a silent
  drop. **UNRESOLVED** which exclusion set is correct.
- **Multiple behavioural records in a gap** — **UNRESOLVED.**

No vague temporal term is used anywhere in this document. "After" appears only as the strict
`seq`/line-number ordering above.

---

## 10. Falsifiability — one statement per candidate

Each is an existence-form statement refutable by a single counterexample, requiring **no threshold**.
No threshold is introduced anywhere in this document.

| | Frozen-candidate falsifiable statement |
|---|---|
| A | *(withdrawn — §7.1)* |
| B | *(withdrawn — §4.1)* |
| C | "On every tick, `intent` and `attempted` designate the same target." Refuted by one tick where they differ. |
| D | "Every episode containing at least one DESYNC read terminates in the same mode as every episode containing none." Refuted by one pair of episodes differing in termination mode across the exposure classes. |
| E | "The reward branch taken at `3922` is identical for DESYNC and non-DESYNC reads." Refuted by one read of each class taking different branches. |

**Each is deliberately weak.** A refutation establishes only that the two classes are *not
identical* on that outcome. **It establishes nothing about magnitude, direction or importance**, and
no such quantity may be added later. Whether these statements are *worth* refuting is exactly what
independent review should attack.

---

## 11. Post-hoc control

Non-negotiable if U1 proceeds:

1. **Exactly ONE primary outcome**, chosen and frozen before any U1 data exists.
2. The analysis population, exclusions, falsification rule and reporting format frozen with it.
3. **No alternative primary outcome may be selected after collection**, and no exploratory secondary
   outcome may be promoted to primary. That promotion is the M8 failure mode.
4. The outcome must be selected on the **structural grounds in §7 and §8**, never because it
   produces an interesting answer.

**Nothing in this document has been chosen because of an expected result. Two candidates were
eliminated on source grounds; no candidate was evaluated against data.**

---

## 12. Qualitative ranking

No numerical scoring — the Director's instruction is explicit that a scoring system would itself
need freezing, and none is frozen.

| Rank | Candidate | Why |
|---:|---|---|
| **1** | **D — episode termination mode** | Only candidate whose outcome is both directly observable and at an aggregation level that avoids per-tick pairing degeneracy. Highest information gain: episode termination is the closest observable to "did the agent get where it was going". **Concern undischarged:** shared `goalReset` field, §5 D. |
| 2 | E — reward branch at the evaluation | Directly observable, no intervention; but interacts with `episodeUnique` and the outcome is coarse |
| 3 | C — intent ↔ executed divergence | Cleanest conceptually, but may be equal by construction — **NOT ESTABLISHED**, and if it is, the candidate dies |
| — | B — StepLedger support | **Rejected**: requires an intervention |
| — | A — slip vs success | **Rejected**: structurally degenerate |

---

## 13. Draft pre-registration structure — nothing frozen

| # | Section | Status |
|---|---|---|
| 1 | Question | Draft, §1 — association form, not causal |
| 2 | Scientific motivation | Draft, §2 |
| 3 | What M7–Q1 established | Available from the committed synthesis |
| 4 | What remains unknown | Available, §2 |
| 5 | Operational definition of DESYNC | **Inherit unchanged** from M8 §2 / Q1 §2 |
| 6 | **Primary behavioural outcome** | **UNRESOLVED — the central open decision** |
| 7 | Unit of observation | **UNRESOLVED** — tick vs episode; follows from 6 |
| 8 | Temporal ordering | Constrained by §9; specifics **UNRESOLVED** |
| 9 | Population | **UNRESOLVED** |
| 10 | Inclusion / exclusion rules | **UNRESOLVED** — must cover the §9 skip cases |
| 11 | Falsifiable statement | Candidate forms in §10; final choice **UNRESOLVED** |
| 12 | Interpretation limits | Draft, §6 |
| 13 | Causal prohibition | **Settled — prohibited absolutely**, §6 |
| 14 | Degeneracy protections | Framework in §7; per-candidate discharge **UNRESOLVED** |
| 15 | Reproducibility requirements | Inherit Q1 §12 |
| 16 | Minimum evidence | **UNRESOLVED** — and see the D-006 lesson: any minimum is Director judgment |
| 17 | Stopping rule | **UNRESOLVED** — the D-006 §5 fixed-range/no-extension form is the precedent |
| 18 | Seed governance | **UNRESOLVED** — admissible space is strictly below `899000`; nothing else settled |
| 19 | Instrumentation neutrality | **Settled in principle** — must not arm `__MFW_STEP_LEDGER__` (§4.1) |
| 20 | Analysis lock | Draft, §11 |
| 21 | Reporting requirements | **UNRESOLVED** |
| 22 | Limitations | Draft, §6 and §12 |

**Twelve of twenty-two sections are UNRESOLVED. This is a formulation, not a protocol.**

---

## 14. Adversarial self-audit

| # | Question | Answer |
|---|---|---|
| 1 | Did we accidentally define causality? | **No.** §6 prohibits causal interpretation for every candidate and explains why the counterfactual is unobservable. |
| 2 | Did we choose the outcome because it is convenient? | **No.** The most convenient candidate (A, the slip rate, already computed by the environment) is the one rejected. B was rejected despite being the reviewer's suggested substrate. |
| 3 | Did we inspect new data? | **No.** Only committed source and previously reported figures. |
| 4 | Did we generate or inspect seeds? | **No.** |
| 5 | Did we introduce a threshold to manufacture falsifiability? | **No.** Every statement in §10 is existence-form, refutable by one counterexample. |
| 6 | Could the outcome be tautologically implied by DESYNC? | **Checked for each.** A: yes → rejected. C: **UNRESOLVED** → flagged, not adopted. D: concern named and undischarged. |
| 7 | Could the population be empty? | **UNRESOLVED for D** and recorded as such in §7.2. |
| 8 | Could the outcome be unavailable for some events? | **Yes** — the `next === null` / `_goalResetJustHappened` skip. Recorded in §4 item 5 and §9 as a mandatory explicit exclusion. |
| 9 | Did we reuse a post-hoc Q1 choice without justification? | **No.** Only the DESYNC definition (frozen before Q1, inherited from M8 §2) and the §4 taxonomy are carried over; both predate Q1's post-hoc partition. |
| 10 | Did we introduce a new statistical method? | **No.** No test, threshold, interval, model or effect size. |
| 11 | Did we change any frozen artifact? | **No.** All digests revalidate. |
| 12 | Did we formulate an experiment instead of a question? | **No.** No seed range, tick budget, arm, sample size or collection procedure is proposed. Twelve of twenty-two sections are UNRESOLVED. |

---

## 15. What independent review must attack

1. **Is Candidate D's shared-`goalReset` concern fatal?** The single most important open question.
2. **Is Candidate C equal by construction?** A source question this audit did not settle.
3. **Is the §7.1 rejection of Candidate A correct** — does `pFor` returning `null` really make
   `outcome` definition-entailed for the sPair class?
4. **Is the §4.1 rejection of Candidate B correct**, or is there a way to record the ledger fields
   that preserves neutrality?
5. **Are the §10 falsifiable statements worth refuting**, or so weak that a refutation would be
   uninformative?
6. **Is the association framing in §6 sufficient**, or does U1 as posed inescapably require a
   counterfactual it cannot have — in which case U1 may not be answerable at all with this
   substrate.

**Point 6 is the one that could invalidate U1 entirely, and it should be attacked first.**

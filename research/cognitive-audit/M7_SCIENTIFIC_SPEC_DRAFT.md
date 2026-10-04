# M7 — Scientific Specification (DRAFT, design only)

**Status:** **Revision 2** — incorporates Gemini Pro's independent review (verdict: *APPROVE WITH REQUIRED CHANGES*) and the Director's rulings of 2026-08-19. Awaiting Director review of this revision. **Implementation remains blocked.**
**Date:** 2026-08-19 (rev 2)
**Author:** Chief Systems Engineer
**Authority:** Director gate — "M7 scientific design only. Do not start implementation." Rulings on all six open questions received; see the Rulings Log below.
**Baseline build:** working tree at HEAD `7c8bdde` + uncommitted M1–M6. **Verified 2026-08-19: all Phase 1.0 gates green, 69/69 assertions** (M1 16/16 + parity 200000/200000, M2+M3 14/14, M4 12/12, M5 9/9, M6 18/18). Reproduction requires `cd experiments/phase1_0` — see [`PHASE_1_0_IMPLEMENTATION_PLAN.md`](PHASE_1_0_IMPLEMENTATION_PLAN.md) §"Verified M1–M6 baseline".
**Scope of this document:** design, audit, and falsification protocol. **No source code, test, or contract has been modified.** One research document — [`PHASE_1_0_IMPLEMENTATION_PLAN.md`](PHASE_1_0_IMPLEMENTATION_PLAN.md) — *was* modified under explicit Director authorisation, as a documentation-and-provenance correction only (Ruling Q5). No experimental mechanism was touched by it.

### Rulings Log — 2026-08-19

| Q | Subject | Ruling | Effect on this document |
|---|---|---|---|
| **Q1** | §7.3 trust rectification | **Direction APPROVED — do not implement yet.** Requires a dedicated gate proving five properties. | §7.3, §14.3 restated as *approved-but-blocked*; new gate **G16** (§15.1) |
| **Q2** | §13.2 Q-learning confound | **APPROVED.** Pin `learningAuthority ≡ 1.0`, disable `dampQ`, in every confirmatory arm, with an explicit gate. | §13.2 and G12 unchanged in substance; G12 wording tightened |
| **Q3** | §3.9 F2b | **Do not fix.** Use the pre-registered telemetry-flag exclusion, provided the analysis makes it explicit. | §3.9, §11, §13.3; residual figure corrected from measurement |
| **Q4** | §3.4 D2 planning | **Keep D2 unrepaired.** M7 is explicitly a one-step belief-use experiment. | §3.4 (ruling + accepted cost), §13.4 (binding), §17.1 (claim scope), §19 (D2-shaped failure named) |
| **Q5** | §3.11/X6 M5 documentation | **Correct it.** Documentation/provenance only. | **Executed.** §3.11/X6 records completion; the correction surfaced three further findings, recorded as new **X7** (gate-id inaccuracy), **X8** (CWD-dependent gates), **X9** (milestone-numbering collision) |
| **Q6** | §9.5 protocol and budget | **APPROVED.** Stage 1 ~175 runs; Stage 2 n from the pre-registered Stage-1 power procedure; hard maximum 4200. **Do not guess n before Stage 1.** | §9.1, §9.5 rewritten |
| — | Controls | **Retain A1, A2, A5, A6, A7.** Do not remove or simplify without Director approval. | §8 locked |
| — | Claim discipline | Strongest permitted claim: *a calibrated internal model of a hidden environmental property causally influencing action selection and adaptation.* No general cognition, intelligence, consciousness, planning, or discovery. | **new §17.1**, with an explicit permitted/forbidden word list binding all M7 artifacts |

> **Claim discipline (§18, carried).** Nothing in this document asserts that MiniFlyWire is cognitive. It specifies an experiment whose *negative* result is as publishable, and as expected, as its positive one. Every number below labelled **measured** was produced by a read-only probe run against this working tree during design; the probes are described in §14.6 so they can be re-derived. Numbers labelled **claimed** are quoted from prior Phase 0 / Phase 1.0 documents and were *not* independently re-derived here.

---

## 1. Executive question

**Can MiniFlyWire maintain useful internal beliefs about an environment whose dynamics are not fully known, and can those beliefs causally change its decisions in ways that improve future performance?**

Decomposed into the five-link causal chain the Director specified, each link independently measurable and independently falsifiable:

```
   observation ──①──▶ belief update ──②──▶ belief becomes informative
        ──③──▶ decision changes ──④──▶ future outcome changes
```

M7 does not ask "does the agent get a better score." It asks whether **every link holds simultaneously**, and reports which link breaks when one does. A run-level score improvement with link ② or ③ absent is *not* a positive result — it is evidence for a competing hypothesis (§5).

**The honest prior.** The Phase 0 verdict was that MiniFlyWire is not cognitive because the `ACTION → OUTCOME` arrow has no referent. M7 supplies a referent. It does **not** follow that the agent will use it. On the evidence in §3, the most likely single outcome is that link ③ or link ④ fails. The design is built to detect that cleanly rather than to avoid it.

---

## 2. First-principles definition

### 2.1 What makes a system "cognitive" in the narrow operational sense relevant here

The word is used here only in a restricted, testable sense. A system possesses the capability under test iff there exists an internal variable `b` such that all five conditions hold:

| | Condition | Why it is required | How M7 tests it |
|---|---|---|---|
| **C1** | `b` is a **statistic of the system's own past observations** — not a constant, not a hand-set parameter, not a function of information available at decision time. | Excludes static heuristics (H-C) and excludes anything computable without experience. | Update counter; `b` distribution non-degenerate; `b` differs across runs with identical starting state but different outcome histories. |
| **C2** | `b` **estimates a property of the environment that is hidden** — not derivable at decision time by any function of the observables. | Without a hidden referent, `b` estimates a constant and carries no information. This is precisely the Phase 0 blocking issue. | Calibration against ground truth (§10.2), plus a *leakage control* proving no observable predicts the hidden variable (§13.10). |
| **C3** | `b` **enters action selection with nonzero derivative**, `∂(score)/∂b ≠ 0`, and that derivative is realised as changed argmax outcomes at nonzero rate. | A computed-and-discarded belief is not a belief in any operational sense. Nine of MiniFlyWire's thirty components fail exactly here. | Analytic derivative (**measured**, §3.2) plus paired argmax-flip rate under identical RNG (§10.3). |
| **C4** | Removing **only** `b`'s influence on the decision — holding every other mechanism, every RNG draw and the environment fixed — **degrades performance**. | Establishes necessity, not mere presence. | ABLATION arm (§8). |
| **C5** | The degradation in C4 is attributable to `b`'s **correspondence to the hidden variable**, not to its mere presence as an extra term. | This is the difference between a belief and a lucky regulariser or a changed exploration temperature. | SHUFFLED arm (§8) — identical value distribution, destroyed correspondence. |

**C5 is the load-bearing condition and the one most systems fail.** Any design that omits it produces a result Gemini can dismiss in one sentence.

### 2.2 What is explicitly *not* accepted as evidence

- A module named `belief`, `uncertainty`, `planning`, `curiosity`, or `prediction` existing, exporting, or being imported.
- A quantity being *computed*. Computation without consumption is measured as zero here.
- A quantity being *passed into* the scorer. MiniFlyWire's scorer destructures three parameters into a documented "accepted, unused" block; being an argument proves nothing.
- Improved reward alone. Reward improvement is the *last* link, and four of the five competing hypotheses in §5 also predict it.

### 2.3 Why a deterministic, fully observable graph cannot support any of this

This is not an assertion carried over from Phase 0. It is re-derived from the current source:

**(a) Transitions are deterministic and executed unconditionally.** [`main.js:4662`](../../main.js:4662) is `agentCurrent = next;`, guarded only by a null check and a goal-reset guard. There is no stochastic element and no failure mode. The transition function is the identity on the agent's own choice.

**(b) Therefore state prediction error is structurally zero — by variable identity, not by luck.** The expectation is generated at [`main.js:2882`](../../main.js:2882) with `predictedNextId: window.lastReasoning.to`. It is evaluated at [`main.js:3821`](../../main.js:3821) with `actualNextId: next`, where `next` was assigned `window.lastReasoning.to` at [`main.js:3650`](../../main.js:3650). These are **the same variable read twice**. [`render/predictionError.js:155`](../../render/predictionError.js:155) compares them with `String(a) === String(b)`, so `statePredictionError ≡ 0.0` identically. No amount of experience changes this.

**(c) Reward is computable at decision time.** [`main.js:3745`](../../main.js:3745)–`3785`: `rewardSignal` is a threshold function of `sim` (embedding cosine similarity, available to the scorer before acting) and of `next === goalNeuronId` (known before acting). Only the `episodeUnique >= 3` guard introduces history dependence, and that is a property of the agent's own trajectory, not of the world.

**(d) Consequently the composite prediction error is a tautology.** [`render/predictionError.js:245`](../../render/predictionError.js:245) weights `reward 0.40 + state 0.30 + semantic 0.20 + goal 0.10`. The state term is identically 0 by (b). The reward and semantic terms compare an internal memory lookup against a quantity the same tick computes from the same static embeddings. Nothing in the composite measures a gap between the agent and the world, because there is no such gap.

**The general principle:** belief, uncertainty, planning, counterfactual reasoning and active information-gathering are all mechanisms for *acting well despite not knowing something*. When there is nothing the agent does not know, these mechanisms are not merely unused — they are **undefined**. Their absence is a single fact about the environment, not nine independent implementation oversights. This is why M7 must change the environment, and why changing anything else first would be measuring noise.

---

## 3. Current MiniFlyWire capability audit

Every finding in this section was verified against the working tree during design. Line references are to the current (M1–M6) state.

### 3.1 How transition uncertainty is currently represented, updated, and consumed

| Question | Answer | Evidence |
|---|---|---|
| **Representation** | `Map<"fromId->toId", number>` in `[0,1]`, module-private, session-only, absent from `saveBrain`. | [`render/predictionError.js:503`](../../render/predictionError.js:503) |
| **Update** | Single EMA, `u ← u + 0.12·(err − u)`, clamped `[0,1]`. One update per learning step. | [`render/predictionError.js:510`](../../render/predictionError.js:510) |
| **Driven by** | `predError.compositeError` — i.e. by the tautological composite of §2.3(d). | [`main.js:3868`](../../main.js:3868) |
| **Read (mutating)** | `getTransitionUncertainty` decays the stored value ×0.998 per read and deletes below 0.005. | [`render/predictionError.js:578`](../../render/predictionError.js:578) |
| **Read (pure, M6)** | `peekTransitionUncertainty` — measurement only; static guard forbids agent-path use. | [`render/predictionError.js:568`](../../render/predictionError.js:568) |
| **Consumed by the decision?** | **No.** Passed at [`main.js:2036`](../../main.js:2036) into `calculateDecisionScore`, destructured at [`render/scoring.js:168`](../../render/scoring.js:168) into the `// Additional params (accepted, unused)` block. The return value of the call at 2036 is discarded; the call exists only for its decay side effect. | **Measured**, §3.2 |

### 3.2 Which channels actually reach the decision — measured, not asserted

Read-only sweep of `calculateDecisionScore` imported live from `render/scoring.js`, all other terms held at zero (which sets `curiosityState = 0`, making the internal `drift` term exactly 0, so every call is deterministic):

| Candidate belief channel | Scorer parameter | Score range over the channel's full domain | Verdict |
|---|---|---|---|
| M6 per-transition uncertainty | `transitionUncertainty` ∈ [0,1] | `0.000000000` | **ZERO INFLUENCE** |
| Global prediction uncertainty | `uncertaintyScore` ∈ [0,1] | `0.000000000` | **ZERO INFLUENCE** |
| Epistemic ledger | `uncertaintyState` ∈ [0,1] | `0.000000000` | **ZERO INFLUENCE** |
| Sequence error | `sequenceError` ∈ [0,1] | `0.000000000` | **ZERO INFLUENCE** |
| Look-ahead / planning | `futureBonus` ∈ [0,20] | `24.0` (slope **+1.2**/unit) | wired — but see §3.4 |
| **Bayesian path trust** | **`bayesianTrust` ∈ [0,1]** | **`6.0`** | **LIVE** |

**This is the single most important result of the audit.** Of six candidate belief channels, exactly one is simultaneously wired *and* fed by a live estimator: `bayesianTrust`.

Its exact form, measured:

```
   bayesianTrust = 0.00  ->  score  0.0
   bayesianTrust = 0.25  ->  score  0.0
   bayesianTrust = 0.50  ->  score  0.0
   bayesianTrust = 0.75  ->  score  3.0
   bayesianTrust = 1.00  ->  score  6.0
```

`trustBonus = max(0, t − 0.5) × 8` at [`render/scoring.js:184`](../../render/scoring.js:184), entering the M1 term array with weight `1.5`, giving an effective slope of **+12 per unit trust, rectified at t = 0.5**. The rectification is a design flaw of first-order importance for M7 and is analysed in §7.3.

### 3.3 The estimator behind the live channel

[`render/trustMemory.js`](../../render/trustMemory.js) maintains per-edge counters and returns a **Laplace-smoothed Beta posterior mean**, `trust(e) = (s_e + 1)/(a_e + 2)` — the posterior mean of `Beta(1,1)` updated by `s_e` successes and `a_e − s_e` failures. It also exposes the exact posterior **variance** (`getTrustUncertainty`), currently imported by `main.js` and never called.

Namespace check (the D1 failure mode): all three sites agree on the bare edge key `from + "->" + to` —

- write attempt: [`main.js:4152`](../../main.js:4152), `agentLast + "->" + next`, fires on every autonomous step where `agentLast !== next`
- write success: [`main.js:4344`](../../main.js:4344), `from + "->" + to` for every edge in `recentMemory`, fires **on goal-reach only**
- read: [`main.js:2065`](../../main.js:2065), `currentKey + "->" + k`

**No namespace split. The channel is coherent.** This is not a broken mechanism awaiting repair; it works, and it is the only one that does.

> ### ⚠ POST-AUDIT CORRECTION (2026-08-20) — the paragraph above is INACCURATE
>
> The original audit text is left in place for provenance. It is wrong, and this note records why.
>
> **What was verified, and what was not.** The audit checked that all three sites use the same key **string format** — `from + "->" + to`. It did **not** check the *runtime provenance of the operands*. Format agreement was mistaken for key agreement.
>
> **The defect.** At the write site (`recordAttempt`, `main.js` ~4182) the variable `agentLast` is **temporally stale**: `agentLast = agentCurrent` executes several hundred lines later in the same tick (~4662). At the moment the attempt key is built, `agentLast` therefore holds the position from the **previous** tick, not the position the agent is moving from. The key becomes `from(move i) → to(move i+1)`, skipping the intermediate node.
>
> **Measured** on a real 60-tick run, seed 20260819000:
>
> ```
> executed moves:  10->6, 6->7, 7->8, 8->5, 5->2, 2->1, 1->6, ...
> attempt keys:    10->7, 6->8, 7->5, 8->2, 5->1, 2->6, 1->5, ...
>
> pathAttempts: 63 keys | real graph edges: 15 | NON-edges: 48
> ```
>
> **48 of 63 written keys are not edges of the graph at all.** Decision-time reads (`getPathTrust(currentKey + "->" + k)`, `main.js` ~2072) query genuine edges, so the trust store is largely written under keys the scorer never reads. This is a temporal-alignment defect of the same family as D1, inside `trustMemory`.
>
> **Consequence for the baseline characterisation.** The per-edge trust channel is *wired* and its derivative on the score is real (`+12/unit`, §3.2 — that measurement stands), but in the pre-M7 build it is fed largely by the flat `Beta(1,1)` prior of `0.5` rather than by accumulated evidence. Corroborated independently: under arm A1, only **67 distinct raw trust values** appeared across **5446** E3 calls in an 80-tick run.
>
> **What this does and does not change.**
>
> - It does **not** change the frozen pre-registration. Frozen §6.1 already re-keys credit to the traversal outcome under M7, so the M7-on path is unaffected by this defect.
> - It does **not** change §3.2's measured derivatives, the arm definitions, or any hypothesis, metric, window, or claim.
> - It **is** deliberately **preserved when M7 is off** (Director ruling, 2026-08-20), so G1 default parity remains valid. The baseline is not "cleaned up".
> - It **does** mean any statement that the pre-M7 trust channel is *coherent* should be read as: coherent in key **format**, misaligned in key **operands**.
>
> Recorded in [`M7_PREREGISTRATION_ERRATUM_05.md`](M7_PREREGISTRATION_ERRATUM_05.md) §4.

**But it is estimating the wrong quantity.** Because success is credited at *episode* level, `trust(e)` currently estimates `P(edge e lay on a goal-reaching episode)` — a function of the agent's own policy and of `e`'s graph distance to the goal, not a property of the world. In a deterministic environment there *is* no property of the world for it to estimate. §7.2 specifies the minimal re-keying that makes it estimate a genuine environment variable; §13.1 treats the circularity objection this invites.

### 3.4 Can planning exploit a new environment? **No — measured.**

D2 was **not** repaired by M1–M6 and is live. [`render/planning.js:355`](../../render/planning.js:355) starts its depth-first search at `dfs(neuron.id, depth)`. `neuron.id` is the THREE.js `Object3D` global instance counter; the graph is keyed by `neuron.userData.id`.

Re-running the Phase 0 Probe B logic against the **current** tree:

```
neuron passed to futureScore: THREE .id = 1004  | .userData.id = 5
futureScore(neuron, goal=16, depth=3)  = 0
same call with id = userData.id        = 13.413033179433699

futureScore != 0 for  0/20 nodes as actually called from main.js
futureScore != 0 for 20/20 nodes if the id bug were fixed
```

**Consequence for M7 — a scoping constraint, not a defect to fix here:** `futureBonus` is wired to the score (slope +1.2, §3.2) but is fed identically zero. The agent has **no look-ahead whatsoever**. M7 can therefore test only *one-step* belief use — "does a belief about the next transition change the next decision." It **cannot** test planning under uncertainty, counterfactual reasoning, or multi-step information-gathering.

> **DIRECTOR RULING Q4 (2026-08-19) — BINDING.** **D2 stays unrepaired for M7.** `render/planning.js` must not be modified; `futureScore` and `futureBonus` must not be modified; planning behaviour must not be changed. **M7 is explicitly and only a one-step belief-use experiment:** it tests whether per-edge belief about the *immediate* transition causally influences the *next* action. Every M7 claim, in every artifact, must be scoped to exactly that sentence.

The engineering reason the ruling is correct: repairing D2 would change `futureBonus` from 0 to a term of magnitude ~16 score points across all candidates, altering the baseline policy globally and confounding every arm against the pre-registered baseline.

**The cost this ruling accepts, stated plainly.** With no look-ahead, belief can only influence the immediately next hop. A belief that edge `e` is unreliable cannot propagate to "avoid the *region* containing `e`." If one-step avoidance on a 20-node graph is too weak a lever, M7 may return a null that reflects the severed planning path rather than the belief hypothesis. §19's escalation rule names this explicitly as a reason to nominate the D2 repair — not further M7 iteration — as the next milestone.

### 3.5 Can Q-learning exploit a new environment? **Yes — and this is the principal threat to the claim.**

Q-learning is intact and correctly keyed after M2/M3 (composite `pos#goal->action`, **claimed** 278/278 readable at gate S2.1). Under stochastic transitions the standard expected-value backup `Q(s,a) ← Q + α[r + γ·max Q(s',·) − Q]` **absorbs edge reliability automatically**: a low-reliability edge produces more no-progress steps at step cost, so its Q value falls without any belief mechanism whatsoever.

**Therefore "belief arm outperforms no-belief arm" is not, by itself, evidence of anything.** Ordinary model-free RL predicts it. The entire discriminating power of M7 rests on the *timing* and *conditional* analyses of §9.4 and §10.3–10.4, not on the endpoint comparison. A design reporting only endpoint performance would be indistinguishable from a Q-learning demo and should be rejected.

### 3.6 Can prediction error measure useful disagreement? Yes — but it becomes a second, uncontrolled belief pathway

Under stochastic transitions, `statePredictionError` becomes genuinely non-zero for the first time (predicted `v`, realised `u`). That is a real gain. It is also a **confound**, because prediction error already feeds two decision-relevant quantities:

- `predError.learningAuthority = max(0.3, 1 − compositeError·0.5)` scales the Q learning rate at [`main.js:3846`](../../main.js:3846) (`effectiveLR = 0.1 × learningAuthority`)
- `compositeError > 0.20` triggers `dampQ` at [`main.js:3899`](../../main.js:3899)

Both are *implicitly* reliability-sensitive. An arm that merely zeroes `bayesianTrust` is therefore **not belief-free**. Handled in §13.2.

### 3.7 Does any existing mechanism already provide part of M7? Yes — most of it

| M7 requirement | Already present | Missing |
|---|---|---|
| Per-edge Bernoulli evidence store | `pathSuccesses` / `pathAttempts` | credit at *traversal* rather than *episode* level |
| Conjugate posterior over a hidden rate | `getPathTrust` = Beta(1,1) posterior mean | — |
| Posterior variance (for uncertainty-directed behaviour) | `getTrustUncertainty` | never called |
| Belief → decision wire with nonzero derivative | `bayesianTrust` → `trustBonus`, slope +12 | rectified at 0.5 (§7.3) |
| Seeded, stream-separated RNG | M4 `liveRng(stream)` | an `"environment"` stream |
| Deterministic headless driver | `benchmarks/harness/headlessShim.js` + `experiments/phase1_0/_driver.js` | per-arm switches, per-decision telemetry |
| Validated telemetry bus + session recorder | `instrumentation/` | M7 event types |
| Matched-arm falsification template | `experiments/exec_influence/` | — |
| **Hidden environment variable** | **nothing** | **the entire referent** |

**The minimum intervention is an environment, not a mechanism.** M7 adds no cognitive module. §14 quantifies the delta at roughly 35 guarded lines in `main.js`, one new file *outside* `render/`, one approved-but-separately-gated one-line scoring change (§15.1/G16), and a harness.

### 3.8 The second trust pathway — the ablation surface is larger than it looks

**This finding changes the arm design and would have silently invalidated a naive experiment.**

`trustMemory` reaches the decision by **two** independent routes:

1. **Per-edge (§3.2):** `getPathTrust(u→v)` → `bayesianTrust` → `trustBonus` → score. Carries *which edge* is reliable.
2. **Aggregate:** [`main.js:3232`](../../main.js:3232)–`3245` computes the mean of `(s+1)/(a+2)` over every path with ≥2 attempts and passes it to `updateBehavior({ aggregateTrust })` as a **confidence floor**. That sets `confidenceState` ([`render/behavior.js:20`](../../render/behavior.js:20), floor logic ~525–545), which is a live positive scoring term ([`main.js:2014`](../../main.js:2014)) *and* feeds `focusState = confidenceState − stressState` ([`render/behavior.js:444`](../../render/behavior.js:444)) into the scorer's `dynamicFocus`. Carries *how reliable the world is on average* — a global scalar.

Severing only route 1 leaves route 2 broadcasting a genuine (if coarse) statistic of the hidden variable into the score. The "ablation" arm would still hold a belief, and the measured effect would be biased toward zero for a reason no reader could see.

**Design consequence.** Route 2 is not merely a leak to be plugged — it is the ideal **AGGREGATE-ONLY** control (§8, arm A5). It holds constant "the agent knows the world became less reliable" while removing "the agent knows *which edge* is unreliable." `BELIEF vs AGGREGATE-ONLY` is a far sharper test than `BELIEF vs nothing`, and it is the specific control that defeats the "you just changed the exploration temperature" objection.

### 3.9 Does F2b create a confound? **Yes — and it is a validity blocker for link ③**

[`main.js:3170`](../../main.js:3170): `if (liveRng() < 0.92) { ...think... } else { replayOneEpisode() }`. On the replay branch `window.lastReasoning` is left stale, so the action *executed* is not the action *selected this tick*. Reported in M5, deliberately untouched.

**Two different figures, previously conflated — corrected from measurement (rev 2).** The replay branch *fires* on ~8% of steps, but the M5 gate measured the resulting **stale-execution rate at 17/380 = 4.5%** (`verify_S3.js` S3.2/S3.6, re-run green 2026-08-19). Revision 1 of this document said "~8% of steps execute a stale action," which overstated the contamination by roughly a factor of two. **The correct figure for the analysis set is 4.5%**, and the exclusion rule must be defined by the emitted flag rather than by either nominal rate.

M7's link-③ metric is a per-decision paired argmax comparison. On stale-execution steps the scorer's argmax has no causal relation to the executed action, so those steps inject pure attribution noise into the primary causal measurement — biasing the conditional-advantage estimate (§10.4) toward zero.

> **DIRECTOR RULING Q3 (2026-08-19) — BINDING.** **Do not fix F2b at this stage.** Use the pre-registered telemetry-flag exclusion strategy, **provided the statistical analysis makes the exclusion explicit** (§11). Do not modify replay behaviour unless a revised scientific analysis shows the exclusion is invalid.

Implementation: emit a `replayBranch: true/false` flag *and* a `staleExecution: true/false` flag (the latter is the quantity that actually matters, and the two are not equal), **pre-register exclusion of stale-execution steps from the link-③ and link-④ analysis sets**, and report both filtered and unfiltered results. Measurement-only; no behavioural change; M6 discipline. Gate G8 proves both flags fire on exactly the right steps.

### 3.10 Does D8/F12 create a confound? Yes, but only via a pathway M7 holds constant

`rewards` is bare-keyed everywhere ([`main.js:1560`](../../main.js:1560), `3072`, `4301`, `4444`; [`render/planning.js:260`](../../render/planning.js:260)) while Q is composite. `predictedReward` at [`main.js:2898`](../../main.js:2898) reads the bare map, so `rewardPredictionError` — the 0.40-weighted term — is partly a namespace artifact rather than a measure of surprise. This propagates only through `learningAuthority` and `dampQ`, both of which §13.2 pins constant across arms in the confirmatory comparison. **Affects the secondary prediction-error analysis; does not affect the primary claim.** Do not fix.

### 3.11 Other findings affecting M7 validity

> **Label namespace.** Findings in this section are **X1–X9**. They are unrelated to the experimental arms **A1–A7** of §8. (Revision 1 used an `A` prefix here, which collided with the arm labels once X7–X9 were added.)

| # | Finding | Effect on M7 | Action |
|---|---|---|---|
| **X1** | **D12 is latent but currently unreachable.** `episodeRewards` is undeclared yet referenced at [`main.js:4545`](../../main.js:4545) — but `recentMemory.length = 0` executes first at [`main.js:4484`](../../main.js:4484), so the `forEach` body never runs. No enclosing `try` exists in that range. | Any M7 change leaving `recentMemory` non-empty at 4545 turns this into a hard `ReferenceError` mid-run. | Harness **must fail loudly** on run crash. Silently dropping crashed runs would create survivorship bias correlated with reliability. Gate G10. |
| **X2** | **All 9 Phase 0 probes hardcode `E:/tmp/mfw/`** and cannot execute against this repository. Verified: every file in `research/cognitive-audit/probes/` contains that path; `experiments/phase1_0/` correctly uses relative resolution. | Phase 0's headline numbers are **not reproducible in place**. M7 must not cite them as baselines without re-derivation. | M7 re-derives every baseline it uses. Repointing the Phase 0 probes is a separate housekeeping item for the Director. |
| **X3** | **ESM module caching.** `main.js` has top-level side effects; a second `import` returns the cached instance and does **not** re-run the app. The comment in [`experiments/phase1_0/_driver.js:23`](../../experiments/phase1_0/_driver.js:23) ("re-importing re-runs the app") is misleading. | One OS process per run is **mandatory**. Batching runs in-process would silently share learned state across arms — total benchmark contamination. | Gate G10; §9.6. |
| **X4** | **Persistence.** `setInterval(saveBrain, 5000)` at [`main.js:1029`](../../main.js:1029) writes to `localStorage`; startup reads it back at [`main.js:731`](../../main.js:731). The shim provides a fresh in-memory store per boot, so the harness is safe *today* — but only by accident of the shim. | Cross-run contamination risk. | Gate G10 asserts a cold store at every run start. |
| **X5** | **Reward-eligibility interaction.** The goal reward requires `episodeUnique >= 3` ([`main.js:3743`](../../main.js:3743)). Slips do not add unique nodes, so unreliable regions could systematically fail the guard. | A spurious `p_e` → reward-eligibility coupling that is a *design artifact*, not agent behaviour. | Gate G15 measures eligibility rate against `p_e` and requires no systematic dependence. |
| **X6** | **Stale documentation — RESOLVED 2026-08-19.** [`PHASE_1_0_IMPLEMENTATION_PLAN.md`](PHASE_1_0_IMPLEMENTATION_PLAN.md) listed **M5 as ⏸ (not started)** while the F2 repair was in the tree ([`main.js:2234`](../../main.js:2234), `exploreChoice`) and gated. | **Documentation-integrity issue, not a scientific one.** M7's pre-registration must name the exact baseline build. | **Corrected under Director Ruling Q5.** Table row set to ✅ COMPLETE — 9/9; an M5 detail section and a verified M1–M6 baseline block were added; documentation only, no source or test touched. See §3.11/X7–X9 for three further findings surfaced by that correction. |
| **X7** | **Gate-id inaccuracy.** `verify_S3.js`'s header comment reads `GATE : S3.1 – S3.7`, but the file implements **S3.1–S3.6** (9 assertions). **No S3.7 is defined or executed.** Revision 1 of this document repeated the header's claim. | Minor, but M7's pre-registration cites gate ids. A reviewer checking for S3.7 would find nothing and could reasonably question the baseline. | Recorded in the plan document. **Not corrected** — editing the comment would modify a test file, which is outside a documentation correction. |
| **X8** | **Two Phase 1.0 gates are CWD-dependent.** `verify_S2.js` and `verify_S4.js` resolve paths relative to the working directory and fail with `ENOENT` from the repository root. All seven scripts pass from `experiments/phase1_0`. | **Reproducibility of the baseline M7 cites.** A reviewer running them from the root would see two failures and conclude the baseline is broken. | Reproduction command recorded in the plan document; **must be carried into the M7 pre-registration**. Not fixed — would modify test files. |
| **X9** | **Milestone-numbering collision.** The plan's own table already uses **M7** for "Q2 measurement — which subsystem updates go inactive after F2." That is a different, far smaller milestone than this belief experiment. | Provenance ambiguity in every future citation of "M7". | Disambiguation note added to the plan. **Not renumbered** — renumbering is a scope decision for the Director, not a documentation fix. Until ruled: cite this document as **"M7 (belief experiment)"** and the other as **"M7-Q2 (branch-migration measurement)"**. |

### 3.12 Audit verdict

> The belief→decision wire M7 needs **already exists, is measurably live, and is namespace-coherent**. It carries a textbook conjugate posterior. What is missing is not a mechanism but a **referent**: an environment property the posterior could be *about*. Four of the five remaining belief channels are severed (`∂score/∂b = 0`, measured), planning is severed at the id level (measured), and prediction error is tautological by variable identity. M7 is therefore correctly framed as an **environment intervention plus a wiring correction**, and any proposal to add a cognitive module should be rejected as unnecessary.

---

## 4. Hypothesis

**H1 (primary, directional).** In an environment with hidden per-edge transition reliability `p_e`, MiniFlyWire's existing Beta-Bernoulli path-trust estimator will (i) converge toward `p_e`, (ii) change action selection at a measurable rate, and (iii) the decisions it changes will yield higher subsequent return than the decisions the belief-severed agent makes in the identical state under the identical RNG stream.

**H1 is stated so it can fail at three separable places**, and the design reports *which*.

**H0 (null).** With belief severed, performance, adaptation speed, and post-shift recovery are statistically indistinguishable from the belief arm at the pre-registered sample size.

**H1-strict (the claim that would actually be interesting).** The advantage of H1 survives against **AGGREGATE-ONLY** (§3.8) and **SHUFFLED** (§8) — i.e. it derives specifically from per-edge correspondence between belief and hidden variable, not from a global reliability signal and not from the presence of an additional score term.

*Only H1-strict, if supported, licenses the phrase "belief causally improved decisions."* H1 alone licenses at most "an edge-reliability estimate improved performance," which is a claim about an estimator, not about cognition.

---

## 5. Competing hypotheses and their discriminating predictions

Each row states the *unique* signature by which the design separates it. Predictions marked **✦** are shared by no other hypothesis.

| | Hypothesis | Unique discriminating prediction | Arm / metric that isolates it |
|---|---|---|---|
| **A** | **Genuine belief-based adaptation** | ✦ Advantage is **largest early and immediately after the reliability shift**, shrinking as Q converges; calibration ρ(t_e, p_e) is high; flip rate rises with \|t_e − 0.5\|; conditional advantage on flipped decisions > 0; **survives SHUFFLED and AGGREGATE-ONLY**. | BELIEF vs A2/A5/A6; §10.2–10.4; shift window |
| **B** | **Ordinary model-free RL** | ✦ ABLATION **matches BELIEF asymptotically and recovers at the same rate** after the shift; belief adds ≤ noise once Q has equal sample budget. | ABLATION (A2) — Q intact, belief severed; §9.4 phase analysis |
| **C** | **Static heuristics** | ✦ **FROZEN matches BELIEF**; no learning curve; performance independent of experience and of `p_e`. | FROZEN (A4) |
| **D** | **Memorization** | ✦ High performance on the trained configuration, **collapse on held-out configurations and after the shift**; low trajectory entropy; belief values track *visit counts* rather than `p_e`. | Held-out configs; shift window; §10.5 entropy |
| **E** | **Random exploration** | ✦ **RANDOM matches BELIEF**; outcome independent of `p_e`; flip rate uncorrelated with belief magnitude. | RANDOM (A3) |

**Note on B.** This is the serious one. §3.5 establishes that ordinary Q-learning absorbs `p_e` for free. The *only* thing separating A from B in this design is **temporal**: a Beta posterior over one edge converges in O(5–10) observations of that edge, whereas Q-learning at `α = 0.1` — further scaled by `learningAuthority` — needs an order of magnitude more, and must propagate value backwards through the graph. **The primary A-vs-B discriminator is therefore the reliability-shift recovery curve (§9.4), not the endpoint.** If the design is under-powered anywhere it will be here, and the pilot (§9.5) exists to find that out before the confirmatory run rather than after.

---

## 6. Environment design

### 6.1 Design constraints, and why each is binding

| Constraint | Reason |
|---|---|
| Reuse the existing 20-node / 39-edge graph unchanged | Isolates the intervention to dynamics. A new topology would confound everything against all prior measurements. |
| Exactly **one** hidden variable family | Adding hidden reward simultaneously would make attribution impossible. Deferred to M8+. |
| The hidden variable must be **unobservable at decision time** and **not inferable from any observable** | C2. Enforced by generation constraints §6.3 and gate G11. |
| The hidden variable must be **decision-relevant** — the reliability-optimal route must differ from the route every existing observable already favours | Otherwise the agent wins by graph distance and semantic similarity alone, and belief is redundant by construction. Gate G13. |
| **No new reward code** | Kills the "reward-design artifact" objection at the root. The cost of unreliability must *emerge* from the existing step/time cost, never from a designed slip penalty. |
| Environment stochasticity drawn from a **separate RNG stream** | Otherwise the added draw desynchronises the cognitive stream between arms and destroys the paired design. This is the reason M4 was a prerequisite. Gate G2. |
| Default **OFF** ⇒ byte-identical to the current build | Gate G1 — the M1/M6 parity discipline. |

### 6.2 Hidden state and dynamics

For each directed edge `e = (u→v)` in `connections.json`, a hidden **traversal reliability** `p_e ∈ [0,1]`, fixed within a phase, never exposed to any agent-reachable code path.

Attempting `e`:

- with probability `p_e` — **success**: the agent arrives at `v`
- with probability `1 − p_e` — **slip**: the agent **remains at `u`**, having consumed one tick

`p_e` is not a graph weight, not a confidence, not a reward. It is an environment parameter held in a harness-owned module outside `render/`, and no cognitive module receives it (except the ORACLE arm's deliberate injection, §8/A7).

**Why slip-in-place rather than slip-to-a-random-neighbour:** it introduces exactly one new outcome, keeps the reachable state set unchanged, and produces cost purely through elapsed time — so no new reward branch is needed, and the existing `agentLast === next` repetition penalty is the only existing rule it touches (audited in §13.7).

### 6.3 Configuration generation

A **configuration** is one assignment `{p_e}` plus a goal node, produced by a config seed drawn from a declared block, independent of every agent seed.

**Primary regime — bimodal.** A fraction `f = 0.35` of edges drawn as UNRELIABLE `p ~ U(0.25, 0.45)`, the rest RELIABLE `p ~ U(0.90, 1.00)`. Bimodal maximises discriminability at fixed intervention size, so the pilot can establish whether *any* effect is detectable before spending power on subtler regimes.

**Secondary regime — continuous.** `p_e ~ Beta(2,2)`. Harder and more realistic, but **EXPLORATORY ONLY** (Director ruling, 2026-08-19). Its activation is governed by a deterministic rule, never a post-hoc judgement of whether an effect looked "detectable": it runs **only if F-11 does not fire AND at least one member of the primary confirmatory family is confirmed at Stage 2** ([`M7_PREREGISTRATION.md`](M7_PREREGISTRATION.md) §3.5). It is not a confirmatory hypothesis, is reported in the exploratory section, and **no claim rests on it**.

**Rejection sampling — a configuration is accepted only if all hold:**

| | Constraint | Enforces |
|---|---|---|
| R1 | ≥ 2 distinct routes from ≥ 6 start nodes to the goal | a choice exists |
| R2 | The **hop-count-shortest** route has strictly **lower expected reliability** than at least one longer route | the hidden variable must *contradict* graph distance; otherwise the existing goal-gradient term already solves the task (gate G13) |
| R3 | \|Spearman ρ(p_e, cosine similarity of e's endpoints)\| < 0.10 | no leakage through embeddings (gate G11) |
| R4 | \|Spearman ρ(p_e, e's graph distance to goal)\| < 0.10 | no leakage through topology (gate G11) |
| R5 | Expected-reliability-optimal policy and hop-optimal policy differ on ≥ 4 states | the hidden variable is decision-relevant (gate G13) |

**R2 and R5 are what make M7 a real test.** Without them a positive result would be explained by "the agent follows the goal gradient," and Gemini would be right to say so.

### 6.4 Observable state

Unchanged from the current build: current node, neighbours, embeddings, own memory (Q, rewards, penalties, trust counters, episodes), goal id, internal motivational state. **The agent never observes `p_e`, the slip flag as a labelled signal, or any function of `p_e` other than the realised outcome sequence.**

The agent *can* infer a slip: it intended `v` and finds itself at `u`. That is the observation channel, and it is the only one.

### 6.5 Reward process

**Completely unchanged.** No new branch, no slip penalty, no reliability term. `rewardSignal` is computed by the existing rules ([`main.js:3684`](../../main.js:3684)–`3785`) on the **realised** transition. Unreliability costs the agent *only elapsed ticks against a fixed budget*.

### 6.6 Initial uncertainty

`Beta(1,1)` — uniform, maximum entropy, the existing Laplace prior. An untried edge ⇒ `trust = 0.5` exactly. This interacts fatally with the rectification at 0.5 and is why §7.3 exists.

### 6.7 Reliability shift (held-out dynamics)

At tick `T_shift = 1500` of 3000, the RELIABLE and UNRELIABLE edge sets are **swapped**, silently. Nothing signals the change. This is the primary A-vs-B discriminator (§5) and simultaneously falsifies D (memorization).

### 6.8 Episode and run structure

| | |
|---|---|
| Run length | 3000 ticks (Phase I: 0–1499 · Phase II: 1500–2999) |
| Start node | random per episode, existing mechanism, from the seeded cognitive stream |
| Goal | fixed within a configuration; rotated across configurations over {8, 12, 16, 19} — composite Q keys (M2) support this |
| Episode end | goal reached (existing reset) or 150 ticks elapsed |
| Environment draws | `liveRng("environment")` — a stream no cognitive code touches |

---

## 7. Cognitive mechanism under test

### 7.1 The mechanism

The **existing** `trustMemory` Beta-Bernoulli estimator, `trust(e) = (s_e + 1)/(a_e + 2)`, re-credited at traversal level, reaching the decision through the **existing** `bayesianTrust → trustBonus` term.

**No new cognitive module is proposed. None is needed.**

### 7.2 Required wiring correction — evidence semantics

Today (§3.3): `recordAttempt` fires per step; `recordSuccess` fires for every edge of a goal-reaching path. So `trust(e)` estimates `P(e was on a successful episode)` — policy-dependent, confounded with goal distance, and *not* an estimator of anything in the world.

Under M7 the same counters must be credited by **traversal outcome**: attempt on every traversal attempt of `e`; success iff *that attempt* succeeded. Then, and only then, `trust(e)` is the posterior mean of `p_e` and calibration (§10.2) is a meaningful test rather than a tautology.

This is a genuine, non-cosmetic change of meaning, and §13.1 addresses the circularity objection it invites head-on.

### 7.3 Contested: the rectification at 0.5

`trustBonus = max(0, t − 0.5) × 8`. Consequences under `Beta(1,1)`:

- an **untried** edge sits at exactly `t = 0.5` — the rectification point
- **every observation that an edge is unreliable** (`t < 0.5`) is **discarded**: the term is 0 for all `t ≤ 0.5`
- the agent can *prefer* a proven-good edge; it can **never avoid a proven-bad one**

**The consequence for the experiment is severe and must be stated plainly.** In any state where all candidate edges have `t ≤ 0.5`, the BELIEF and ABLATION arms are **provably bit-identical** — the arms collapse in exactly the regime where belief matters most (early learning, and the window immediately after the reliability shift, which is the primary A-vs-B discriminator).

**Two options; the Director must choose.**

| | Option | Delta | Cost |
|---|---|---|---|
| **7.3-A** *(recommended; **APPROVED**)* | Make the term symmetric: `(t − 0.5) × 8` | Delete `Math.max(0, …)` — magnitude preserved, no coefficient touched | It **is** a functional-form change to a scoring term. Not a re-tune — gate **G16** (§15.1) proves \|∂score/∂t\| bit-identical above 0.5, correctly signed below, and all other term derivatives unchanged — but it is not nothing, which is why the Director made it a separately gated prerequisite rather than folding it into the M7 delta. |
| **7.3-B** | Leave it rectified | Zero | Accepts a design known *in advance* to null the effect in the highest-signal regime. A null result would then be uninterpretable — indistinguishable from "the test could not have detected an effect." |

**Recommendation: 7.3-A**, on the grounds that 7.3-B produces a negative result that cannot be believed.

> **DIRECTOR RULING Q1 (2026-08-19) — BINDING.** The **scientific direction of 7.3-A is APPROVED**: `trustBonus = Math.max(0, trust - 0.5)` must become the symmetric form. **BUT IT MUST NOT BE IMPLEMENTED YET.** It is reclassified as an *experimental prerequisite* requiring its own verification gate — **G16** (§15.1) — proving all five required properties before a single character of `render/scoring.js` changes. §13.15's "null under 7.3-B is uninterpretable" clause is therefore retired: the confirmatory experiment will run under the symmetric form, once G16 is green.

**Sequencing consequence.** The rectification repair is a gated sub-milestone standing *between* this specification and any M7 run. Order of operations, as amended by Director ruling B2 of 2026-08-19: G16 authored → Director approves G16 → **pre-registration authored, reviewed, frozen and hashed** → rectification implemented → G16 green **and** M1's `verify_S1.js` / `verify_S1b.js` re-run green → only then Stage 1. **The pre-registration freeze precedes the source change**, so the experiment cannot be tuned to the implementation.

### 7.4 Explicitly *not* proposed

Uncertainty-directed exploration via `getTrustUncertainty` (present, uncalled — an obvious and tempting addition, and a second mechanism that would confound attribution); connecting `transitionUncertainty`; repairing D2; hidden reward; any new module. Every one of these is deferred by design, not by oversight.

---

## 8. Baseline and control arms

Seven arms. Every arm differs from BELIEF by **exactly one** manipulation, and each exists to kill one specific alternative explanation.

| | Arm | Manipulation | Kills |
|---|---|---|---|
| **A1** | **BELIEF** | Full: per-edge trust live, aggregate trust live | — (treatment) |
| **A2** | **ABLATION** | `bayesianTrust ≡ 0.5` at [`main.js:2065`](../../main.js:2065) **and** `aggregateTrust ≡ null` at [`main.js:3245`](../../main.js:3245). Q-learning fully intact. **Both** routes of §3.8 severed. | **H-B.** The primary baseline; also the "Q-only" control. |
| **A3** | **RANDOM** | Uniform action selection | **H-E** |
| **A4** | **FROZEN** | Q updates and trust updates disabled; scoring heuristics intact | **H-C** |
| **A5** | **AGGREGATE-ONLY** | Route 2 live, route 1 severed (`bayesianTrust ≡ 0.5`) | "It's a global arousal / exploration-temperature effect." Isolates **per-edge discrimination**. |
| **A6** | **SHUFFLED** | `bayesianTrust = trust(σ(e))` for a fixed derangement σ over edges, re-drawn per run seed | **C5.** Identical value distribution, destroyed correspondence. |
| **A7** | **ORACLE** | `bayesianTrust = p_e` (true hidden value) | Establishes the **ceiling**. Converts the result from an unbounded claim into a fraction of attainable gain. |

**Held identical across all arms:** graph, configuration `{p_e}`, goal, config seed, agent seed, RNG stream initialisation, tick budget, all scoring coefficients, and — per §13.2 — `learningAuthority ≡ 1.0` with `dampQ` disabled.

**Primary comparison:** A1 vs A2 (paired).
**Strict comparisons (required for the H1-strict claim):** A1 vs A5, A1 vs A6.
**Ceiling:** A7. **Sanity floors:** A3, A4.

Reporting **(A1 − A2) / (A7 − A2)** — the fraction of oracle-attainable gain realised — is more honest and more informative than any raw difference, and is pre-registered as the headline effect measure.

> **DIRECTOR RULING (2026-08-19) — CONTROLS LOCKED.** **A1 BELIEF, A2 ABLATION, A5 AGGREGATE-ONLY, A6 SHUFFLED and A7 ORACLE are retained and may not be removed or simplified without explicit Director approval.** This binds the harness as well as the analysis: a run configuration that omits any of these arms is not a valid M7 run, and Stage 1 must exercise all seven. A3 RANDOM and A4 FROZEN are sanity floors and are not covered by the lock, but no cost saving justifies dropping them either — they are two runs each.

---

## 9. Experimental protocol

### 9.1 Pre-registration (mandatory, before any confirmatory run)

Following the repository's existing `c`-parameter discipline: primary metric, arm list, α, exclusion rules (§3.9), analysis windows, and all §12 falsification thresholds are written to [`M7_PREREGISTRATION.md`](M7_PREREGISTRATION.md) (path fixed by Director ruling of 2026-08-19: `research/cognitive-audit/M7_PREREGISTRATION.md`, **not** under `experiments/m7/`), **SHA-256 hashed**, and the hash recorded **before Stage 1 runs** (not merely before the confirmatory stage — see the Ruling Q6 block below, and §9.5). Anything decided after seeing confirmatory data is reported as exploratory, in a separate section, and supports no claim.

> **DIRECTOR RULING Q6 (2026-08-19) — BINDING, and it changes what gets pre-registered.** The confirmatory **n is not a pre-registered constant**. What is pre-registered is the **procedure that computes n**. The pre-registration must therefore contain, fixed and hashed *before Stage 1 runs*:
>
> 1. the **power procedure itself** — test (Wilcoxon signed-rank), α = 0.01 Holm-corrected over the primary family of **six** hypotheses, target power ≥ 0.80, and the primary metric and windows (W1 and W3 return) the calculation is performed on;
> 2. the **estimator** used to turn Stage-1 output into n — variance estimated from the Stage-1 paired differences, effect size taken as the Stage-1 point estimate with **no upward adjustment**;
> 3. the **hard maximum of 4200 confirmatory runs** (30 configs × 20 seeds × 7 arms), which n may not exceed regardless of what the power calculation returns;
> 4. the rule that if the procedure returns an n **above** the cap, the study proceeds at the cap and is **reported as under-powered by the pre-registered margin** — the cap is never met by shrinking the arm set or the windows;
> 5. the **exact baseline build** (§Status: HEAD `7c8bdde` + M1–M6, 69/69 gates green) and the CWD-dependent reproduction command of §3.11/X8.
>
> **Do not guess the final confirmatory n before Stage 1.** Any n written into the pre-registration as a number, rather than as the output of this procedure, violates the ruling.

**Why this is stronger, not weaker, than pre-registering a constant.** Pre-registering a guessed n and then revising it after seeing pilot data is the standard way a study launders flexibility into apparent rigour. Pre-registering the *procedure* removes the discretion at the point where it would matter, while still letting the pilot do its job.

### 9.2 Seeds

| Purpose | Block | Use |
|---|---|---|
| Configuration generation | `900000–900999` | `{p_e}`, goal, shift assignment |
| Agent / cognitive stream | `20260819000–20260819999` | all agent randomness |
| Environment stream | derived: `agentSeed XOR 0x5EED` | Bernoulli traversal draws **only** |
| Shuffle permutation (A6) | derived: `agentSeed XOR 0xBEEF` | σ |
| Pilot configs | `900000–900004` | tuning permitted |
| **Held-out configs** | `900500–900529` | **confirmatory only; never inspected during design or tuning** |

Every (config, agent-seed) pair is run through **all seven arms** with identical seeds — a fully paired design.

### 9.3 Held-out conditions — stated precisely

MiniFlyWire learns online; there is no checkpoint and therefore no conventional train/test split, and claiming one would be misleading. "Held-out" here has one specific meaning: **any choice made by a human during design — analysis windows, exclusion rules, the bimodal parameters — is fixed on pilot configurations `900000–900004` and frozen, then the confirmatory runs use configurations `900500–900529` which no human has inspected.** This guards against overfitting the *protocol*, which is the only thing that can be overfitted here. **The §7.3 rectification is not in this set**: Ruling Q1 settled it at Director level before any run, and it is verified by gate G16 rather than chosen from pilot data.

The reliability shift (§6.7) provides the within-run held-out dynamics.

### 9.4 Run structure and analysis windows

| Window | Ticks | Purpose |
|---|---|---|
| **W1 early** | 0–299 | Fast-belief advantage. Beta converges in O(5–10) samples/edge; Q does not. **Primary A-vs-B window.** |
| **W2 mid** | 300–1499 | Convergence behaviour |
| **W3 post-shift** | 1500–1799 | **Re-adaptation speed. The strongest A-vs-B discriminator** (§5) |
| **W4 late** | 1800–2999 | Asymptote — where A and B are *expected to converge*; a null here is predicted by H1 and is **not** evidence against it |

Pre-registering that **W4 is expected to show no difference** is essential: without it, a null at asymptote could be misread as a refutation, when H1 explicitly predicts it.

### 9.5 Two-stage protocol

**APPROVED under Ruling Q6.**

**Stage 1 — Pilot. ~175 runs** (5 configs × 5 seeds × 7 arms). Purposes, as ruled:

1. **verify all required gates** — **G1–G6 and G8–G15** (G7 is superseded by G16), plus G16 green as a prerequisite before Stage 1 begins at all;
2. **establish measurable variance** in the primary metric;
3. **verify the environment is discriminating** — this is the F-11 check (ORACLE ≫ ABLATION) and it is evaluated *first*; if it fails, Stage 2 does not run;
4. **estimate variance and effect characteristics** per window;
5. **perform the pre-registered Stage-1 power calculation** of §9.1 to determine the Stage-2 n.

**The pilot may not be reported as evidence for or against H1.** Its outputs are gate verdicts, variance estimates, and one integer.

**Stage 2 — Confirmatory.** Held-out configs (`900500–900529`). **n is the output of the pre-registered Stage-1 power procedure**, subject to a **hard maximum of 4200 runs**. The pre-registration hash is frozen before Stage 1, not before Stage 2 — because under Ruling Q6 the hashed artifact contains the *procedure*, and the procedure must be immune to the pilot's results.

### 9.6 Execution requirements (from §3.11)

One OS process per run (A3 — ESM caching); cold `localStorage` per run (A4); crash ⇒ loud failure and an explicit record, never a silent drop (A1); per-run telemetry via the existing validated `instrumentation/` bus; `report.json` in the `experiments/exec_influence/` format.

---

## 10. Metrics — one per causal link

### 10.1 Link ① — observation → belief update *(existence)*

`n_updates`; fraction of traversed edges with ≥ 3 observations; entropy of the `trust` distribution. **Pass:** non-degenerate. A failure here means the wiring is broken, not that the hypothesis is false.

### 10.2 Link ② — belief becomes informative *(calibration)*

**Primary:** Spearman `ρ(trust_e, p_e)` over edges with ≥ 5 attempts, at end of Phase I and end of Phase II, against a permutation null.
**Secondary:** Brier score of `trust_e` predicting the next traversal outcome, vs. a global-base-rate predictor.
**Diagnostic:** calibration curve, 10 bins.
**Anti-memorization:** partial correlation of `trust_e` with `p_e` **controlling for visit count** — separates "belief tracks the world" from "belief tracks where the agent went."

### 10.3 Link ③ — decision changes *(argmax flip rate)*

Paired, per-decision, under identical state and identical RNG stream position:

```
flip_rate = #{ticks : argmax(A1 candidates) != argmax(A2 candidates)} / #ticks
```

**Stale-execution** steps excluded per §3.9 and Ruling Q3 (both filtered and unfiltered reported, per §11 "Exclusion transparency"). Also reported: flip rate as a function of `max_e |trust_e − 0.5|` — under H1 this must be **monotone increasing**; under H-E it is flat. That monotonicity is a strong, cheap, and specific test.

### 10.4 Link ④ — changed decisions improve outcomes *(conditional advantage)*

**This is the metric that isolates the causal contribution of belief, and it is the one a run-level comparison cannot provide.**

Restrict to flipped decisions. For each, compare realised return over the next `k = 20` ticks, A1 vs A2, from the identical state. Report the mean paired difference with a bootstrap CI over configurations.

Also: **slip rate on chosen edges**, A1 vs A2 — the most direct behavioural read-out. If belief is doing what it claims, the belief agent traverses more reliable edges. If this is flat, no amount of score difference should be believed.

### 10.5 Link ⑤ — run-level outcome

Primary: **mean return per 100 ticks**, per window. Secondary: goal-reach rate; median steps-to-goal; **post-shift recovery half-life** (ticks to regain 50% of pre-shift return — the A-vs-B statistic). Anti-memorization: trajectory entropy; performance on held-out vs. pilot configs.

---

## 11. Statistical analysis

| | |
|---|---|
| **Design** | Fully paired: config × seed × arm; arms differ only in the manipulation |
| **Primary test** | Wilcoxon signed-rank, A1 vs A2, on W1 and W3 return (distributions are not assumed normal) |
| **Effect size** | Matched-pairs rank-biserial correlation + **fraction of oracle-attainable gain** `(A1−A2)/(A7−A2)`, bootstrap CI over configurations (10 000 resamples) |
| **α** | **0.01**, Holm-corrected across the primary family of **six** hypotheses: {A1vA2, A1vA5, A1vA6} × {W1, W3}. *(Rev 2 correction: revision 1 named only the three arm comparisons while separately specifying two primary windows, leaving the count ambiguous — 3 × 2 = 6. Resolved conservatively in [`M7_PREREGISTRATION.md`](M7_PREREGISTRATION.md) §11.1, confirmed by Director ruling 2026-08-19, and reconciled here.)* |
| **Power** *(Ruling Q6)* | ≥ 0.80 at the Stage-1-estimated effect size. **n is the output of the power procedure pre-registered in §9.1, not a pre-registered constant**, and is capped at 4200 runs. If the procedure returns n above the cap, the study runs at the cap and is reported as under-powered by the stated margin. |
| **Calibration** | Permutation null (10 000 shuffles of `p_e` across edges) for Spearman ρ |
| **Link ④** | Paired bootstrap **clustered by configuration** (decisions within a run are not independent) |
| **Multiplicity** | Primary family of **6** pre-registered hypotheses (3 comparisons × 2 primary windows), Holm-corrected. All windows other than W1/W3 and all secondary metrics are **descriptive**, reported with CIs and no p-values. |
| **Reporting** | Every arm, every window, every seed reported — including failures, crashes, and excluded runs with counts and reasons. No metric may be introduced after unblinding without being labelled exploratory. |
| **Exclusion transparency** *(Ruling Q3)* | The F2b exclusion must be **explicit in the analysis, not merely in the protocol**: every table reporting a link-③ or link-④ result carries (a) the count and percentage of steps excluded as stale executions, (b) the same statistic computed on the unfiltered set, and (c) the direction and magnitude of the difference between them. If filtered and unfiltered results **disagree in sign or in falsification verdict**, that is reported as a primary finding and the exclusion is treated as *not validated* — triggering the Ruling Q3 clause under which repairing F2b may be reconsidered. |

**Deliberate choices:** clustering by configuration (ignoring it would inflate significance by treating ~3000 correlated decisions as independent — a likely Gemini attack); α = 0.01 rather than 0.05 given the arm family, Holm-corrected over all six primary hypotheses; CIs privileged over p-values throughout.

---

## 12. Falsification criteria

Pre-registered. **Each kills the claim at a named link.** These thresholds are fixed before Stage 2 and are not negotiable afterwards.

| | Criterion | Threshold | Kills |
|---|---|---|---|
| **F-1** | Belief does not track the hidden variable | Spearman ρ(trust, p) < 0.30, or CI includes 0, at end of Phase I | Link ② — **fatal to H1** |
| **F-2** | Belief does not change decisions | argmax flip rate < 1% of non-replay decisions | Link ③ — **fatal to H1** |
| **F-3** | Changed decisions do not help | Conditional-advantage CI (§10.4) includes 0 | Link ④ — **fatal to H1** |
| **F-4** | No run-level benefit | (A1 − A2) CI includes 0 in **both** W1 and W3 at the Stage-1-determined n (§9.1) | Link ⑤ |
| **F-5** | Gain is not informational | (A1 − A6) CI includes 0 | **C5 — fatal to H1-strict** |
| **F-6** | Gain is not per-edge | (A1 − A5) CI includes 0 | H1-strict; result reduces to a global-arousal effect |
| **F-7** | Ordinary RL explains it | A2 post-shift recovery half-life ≤ A1's | **H-B wins** |
| **F-8** | Static heuristics explain it | A4 ≈ A1 | H-C wins |
| **F-9** | Random explains it | A3 ≈ A1 | H-E wins |
| **F-10** | Memorization | A1 held-out performance < 60% of pilot-config performance | H-D wins |
| **F-11** | Environment is degenerate | ORACLE ≈ ABLATION (A7 ≈ A2) | **The environment does not reward reliability knowledge at all.** The experiment is void — not the hypothesis. Redesign §6 before drawing any conclusion. |

**F-11 is the design's own self-check** and must be evaluated *first*, before any A1-vs-A2 comparison is even looked at. If a perfectly-informed agent cannot beat an uninformed one, nothing downstream means anything, and a null result would say nothing about MiniFlyWire.

---

## 13. Confound analysis

| # | Confound | Mechanism | Treatment |
|---|---|---|---|
| **13.1** | **Circularity** — "you designed the environment to fit the estimator you already had" | The hidden variable is Bernoulli; `trustMemory` is a Beta-Bernoulli estimator. Conjugate by construction. | **The most serious methodological objection, and it is partly fair.** Honest defence, in order of strength: (i) as currently wired the estimator credits success at *episode* level and is therefore estimating the **wrong quantity** — §7.2's re-keying is a real change of meaning, so the fit is not free; (ii) Bernoulli edge reliability is the *standard minimal* form of hidden dynamics, selected because it is the smallest departure from determinism, not because it matched a module; (iii) ORACLE bounds the result so the claim is a *fraction of attainable gain*, not an unbounded win; (iv) SHUFFLED holds the estimator's output distribution fixed. **What this does not defend:** M7 tests whether *this* estimator can exploit *this* hidden variable. It does **not** establish general belief-formation capability, and the write-up must say so in those words. |
| **13.2** | **Prediction-error → learning-rate pathway** (§3.6) | Slips raise `compositeError` → lowers `learningAuthority` → scales `effectiveLR`; and triggers `dampQ`. Both are implicitly reliability-sensitive, so A2 is **not** belief-free. | Pin `learningAuthority ≡ 1.0` and disable `dampQ` **in every arm** for the confirmatory comparison (gate G12). This is a manipulation of the baseline and must be declared as such. A 2×2 factorial (belief on/off × PE-α on/off) measures the interaction, but is **EXPLORATORY ONLY** (Director ruling, 2026-08-19): its sample size is deliberately **not** pre-registered, so it is exploratory by construction, reported with CIs and no p-values, and may not be promoted to a confirmatory result. Cost stated openly: the confirmatory result describes an agent with one native pathway pinned. |
| **13.3** | **F2b replay branch** (§3.9) | The replay branch fires on ~8% of steps; the **measured** stale-execution rate after M5 is **4.5%** (17/380, `verify_S3.js` S3.2). On those steps the argmax comparison is not causally connected to the executed action. | Two telemetry flags (`replayBranch`, `staleExecution`) + pre-registered exclusion of **stale-execution** steps from link-③/④ analysis sets; filtered and unfiltered both reported per §11 "Exclusion transparency". No behavioural change (Ruling Q3). Gate G8. |
| **13.4** | **D2 — planning severed** (§3.4) | `futureBonus ≡ 0`, measured. No look-ahead exists, so belief cannot propagate beyond the immediate hop. | **Scoping limit, declared, not fixed — BINDING under Ruling Q4.** `render/planning.js`, `futureScore` and `futureBonus` must not be modified. M7 tests one-step belief use only, and every claim is scoped to that (§17.1). The specific failure pattern that would indicate this scope was the limiting factor — F-1 ✓, F-2 ✓, F-3 ✗ — is named in advance in §19 so it cannot be re-read afterwards as evidence against the belief hypothesis. |
| **13.5** | **D8/F12 bare-keyed `rewards`** (§3.10) | `rewardPredictionError` is partly a namespace artifact. | Propagates only through the pathway pinned by 13.2. Affects secondary PE analysis only. Not fixed. |
| **13.6** | **D12 latent `ReferenceError`** (§3.11/X1) | Unreachable today; could become reachable under M7 changes. Crashes correlated with reliability would create survivorship bias. | Harness fails loudly; crashed runs reported with counts, never silently dropped. Gate G10. |
| **13.7** | **Reward-design artifact** | `episodeUnique >= 3` goal-reward guard interacts with slips; the existing `agentLast === next` repetition penalty could double-charge slips. | No new reward code (§6.5). Gate G15 measures reward-eligibility rate against `p_e` and requires no systematic dependence. Gate G14 fixes realised-vs-intended semantics precisely. |
| **13.8** | **RNG desynchronisation** | An environment draw from the cognitive stream would desync arms and destroy pairing. | Separate `"environment"` stream (M4 infrastructure). Gate G2: cognitive draw count and order identical to the env-OFF build at `p ≡ 1.0`. |
| **13.9** | **Benchmark contamination** | ESM caching + `localStorage` persistence (§3.11 X3, X4). | One process per run; cold store asserted per run. Gate G10. |
| **13.10** | **Observable leakage** | If `p_e` correlated with embeddings or topology, `sim` or the goal gradient would proxy for belief and the agent could "win" without any belief. | Generation constraints R3/R4 + gate G11. Additionally: fit a predictor of `p_e` from observables alone and require near-chance accuracy. |
| **13.11** | **Redundancy with graph distance** | If the reliable route were also the short route, belief adds nothing detectable. | Generation constraints R2/R5 + gate G13. |
| **13.12** | **Exploration-temperature artifact** | Adding *any* per-candidate term perturbs argmax and could improve outcomes by changing exploration, independent of information content. | **SHUFFLED (A6)** — identical distribution, destroyed correspondence. This is the specific reason A6 exists and is non-negotiable. |
| **13.13** | **Multiple comparisons / forking paths** | 7 arms × 4 windows × ~10 metrics. | Pre-registration hash; Holm correction across the primary family of **six** hypotheses (3 comparisons × 2 primary windows); everything else explicitly descriptive. |
| **13.14** | **Dependence within runs** | ~3000 correlated decisions per run treated as independent would massively inflate significance. | All bootstraps clustered by configuration. |
| **13.15** | **~~7.3-B null-result ambiguity~~ — RETIRED by Ruling Q1** | Under rectification the arms are provably identical whenever all candidate trusts ≤ 0.5. | **No longer applicable.** Ruling Q1 approved the symmetric form (7.3-A), so the confirmatory experiment will not run under rectification and a null is not ambiguous on these grounds. Retained as a record of why the rectification repair was made a blocking prerequisite (§15.1/G16) rather than an optional refinement. |

---

## 14. Minimum implementation delta

**Principle: existing modules + small environment change + small wiring change + harness. No new cognitive subsystems.** Every item below carries a causal reason; anything without one was removed from this list.

### 14.1 New files (outside `render/` — no cognitive module gains an export)

| File | Role |
|---|---|
| `experiments/m7/env.js` | Hidden `{p_e}` store, config generator with rejection sampling (R1–R5), Bernoulli draw from the `"environment"` stream. **Harness-owned. Never imported by `render/`.** |
| `experiments/m7/arms.js` | The seven arm switches, all default-off |
| `experiments/m7/run.js` | Single-run driver (one process per run) |
| `experiments/m7/analyze.js` | Metrics and statistics |
| `experiments/m7/verify_M7.js` | Gates G1–G15 |
| ~~`experiments/m7/PREREGISTRATION.md`~~ → **[`research/cognitive-audit/M7_PREREGISTRATION.md`](M7_PREREGISTRATION.md)** | Hashed pre-registration. **Path amended by Director ruling 2026-08-19** — the artifact is governance, not experiment code, and `experiments/m7/` is not to be created yet. **Already authored; not frozen.** |

### 14.2 `main.js` — approximately 35 lines, all guarded, all inert when off

| # | Site | Change | Causal reason |
|---|---|---|---|
| E1 | [`main.js:4662`](../../main.js:4662) | Gate `agentCurrent = next` on `env.attempt(agentLast, next)`. When M7 is off, `attempt()` returns `true` unconditionally. | The single point where determinism enters. There is no other. |
| E2 | [`main.js:4152`](../../main.js:4152) / [`4344`](../../main.js:4344) | Under the M7 flag, credit `recordAttempt`/`recordSuccess` by **traversal outcome** instead of episode outcome | §7.2 — without this the estimator estimates the wrong quantity and calibration is meaningless |
| E3 | [`main.js:2065`](../../main.js:2065) | Arm switch on the `bayesianTrust` read: identity / `0.5` / `p_e` / `trust(σ(e))` | Arms A2, A5, A6, A7 — one switch block, one site |
| E4 | [`main.js:3245`](../../main.js:3245) | Arm switch on `aggregateTrust` | **§3.8 — without this the ablation is incomplete and A2 still holds a belief** |
| E5 | [`main.js:3846`](../../main.js:3846) / [`3899`](../../main.js:3899) | Flag to pin `learningAuthority ≡ 1.0` and disable `dampQ` | §13.2 |
| E6 | decision + step sites | Telemetry emission including the `replayBranch` flag | §3.9, links ③/④. Measurement only. |

### 14.3 `render/scoring.js` — **one line, approved in direction, implementation BLOCKED pending G16**

`Math.max(0, bayesianTrust - 0.5) * 8` → `(bayesianTrust - 0.5) * 8`, per §7.3-A.

**Status under Ruling Q1:** scientific direction approved; **implementation explicitly deferred.** This line may not be changed until **G16 (§15.1) is authored, approved by the Director, and green**, and until M1's `verify_S1.js` and `verify_S1b.js` both re-run green against the modified file. G7 alone is insufficient — it never tested the negative side of the domain, which is the entire point of the repair.

### 14.4 What is deliberately NOT changed

D2 (planning); F2b; D8/F12; D12; `transitionUncertainty` wiring; `getTrustUncertainty` activation; scoring weights; graph topology; reward code; `PHASE_1_0_IMPLEMENTATION_PLAN.md`; any existing research document; any existing test.

### 14.5 Delta summary

**~35 guarded lines in `main.js` + 6 new harness files + 1 approved-but-blocked one-line scoring change (gated by G16).** No new module in `render/`. No new export from any cognitive module. Every arm switch lives at exactly one read site.

### 14.6 Design-time probes (read-only, run from scratch space, **not added to the repository**)

Three probes produced the **measured** numbers in §3. They are recorded here so the Director or Gemini can re-derive them; none wrote to the repository.

1. **Channel-derivative sweep** (§3.2) — imports `calculateDecisionScore` live from `render/scoring.js`, sweeps each candidate channel across its domain with all other terms zero (`curiosityState = 0` makes the internal `drift` draw exactly 0, so calls are deterministic), and reports the score range per channel.
2. **D2 re-derivation** (§3.4) — the Phase 0 `probeB_futurescore_id.mjs` with its hardcoded `E:/tmp/mfw` paths repointed at this repository (§3.11/X2).
3. **M1 gate re-run** — `node experiments/phase1_0/verify_S1.js` → 12 passed, 0 failed, confirming the baseline build is the one described.

---

## 15. Required verification gates

Modelled on the M1/M6 discipline: prove the intervention is inert when off, and that each switch does exactly and only what it claims.

| | Gate | Assertion |
|---|---|---|
| **G1** | **Default parity** | With M7 off and all switches off, action sequence, Q table, trust maps and the full score stream are **bit-identical** to the current build over ≥ 10 seeds × 1000 ticks |
| **G2** | **Stream separation** | Environment draws come only from `"environment"`; cognitive stream draw count and order identical to the off-build |
| **G3** | **Generalisation** | With `p_e ≡ 1.0`, the stochastic build ≡ the deterministic build |
| **G4** | **Ablation completeness** | A2: every `bayesianTrust` read returns exactly 0.5 **and** `aggregateTrust` is null at every call — asserted by counters at both sites, not by inspection (§3.8) |
| **G5** | **Oracle fidelity** | A7 delivers exactly `p_e` for the queried edge |
| **G6** | **Shuffle validity** | σ is a bijection with no fixed point; the multiset of delivered trust values equals BELIEF's at every tick |
| **G7** | **Scoring change is form-only** | Superseded by **G16** (§15.1), which subsumes and extends it. G7 is retained only as G16.1/G16.3. |
| **G8** | **Exclusion-flag correctness** *(Ruling Q3)* | (a) `replayBranch` is true on exactly the steps taking the `liveRng() < 0.92` else-branch; (b) `staleExecution` is true on exactly the steps where the executed action differs from the action selected that tick; (c) the two flags are **verified to differ** — asserting them equal would reproduce the rev-1 conflation the M5 gate disproved (~8% vs 4.5%); (d) the stale-execution rate reproduces `verify_S3.js` S3.2 on the same seed |
| **G9** | **No new cognitive exports** | The export surface of every `render/` module is unchanged (extends the M6.7 gate) |
| **G10** | **Run hygiene** | One process per run; cold `localStorage` asserted at start; any crash fails loudly and is recorded (§3.11 X1/X3/X4) |
| **G11** | **No observable leakage** | Every accepted config satisfies R3 and R4; a predictor of `p_e` from observables alone performs at chance |
| **G12** | **PE pathway pinned** *(Ruling Q2 — explicit gate required)* | In **every** confirmatory arm: (a) a counter proves `learningAuthority` returned exactly `1.0` on 100% of learning steps, with the count of steps reported; (b) a counter proves `dampQ` was invoked **zero** times; (c) both counters are emitted per run and asserted per run, not sampled; (d) a deliberately un-pinned control run is included in the gate and **must fail** these assertions, proving the counters can detect the unpinned state rather than passing vacuously |
| **G13** | **Decision relevance** | Every accepted config satisfies R2 and R5: reliability-optimal and hop-optimal policies differ on ≥ 4 states |
| **G14** | **Realised-vs-intended semantics** | On a slip: the **realised** node enters `agentCurrent`, learning, reward and prediction error; the **intended** edge is what receives the trust attempt. Asserted per step. |
| **G15** | **No reward artifact** | Goal-reward eligibility rate shows no systematic dependence on `p_e` (§13.7) |

**Gates G1, G4, G12 and G13 are the ones whose failure would silently invalidate the experiment rather than break it visibly.** They run before Stage 1 and again before Stage 2.

---

### 15.1 G16 — the trust-rectification prerequisite gate *(Ruling Q1)*

**This gate is a blocking prerequisite.** It must be authored, approved by the Director, and green **before** the `render/scoring.js` change of §14.3 is made, and the change must not be made in anticipation of it. G16 supersedes G7, which tested only the positive side of the domain — the half the repair does not affect.

The Director specified five required properties. Each is decomposed into executable assertions below, so the gate cannot pass by inspection or by narrative.

| | Required property | Executable assertions |
|---|---|---|
| **G16.1** | **Positive-side magnitude is preserved** | `∂score/∂t` for `t > 0.5` is **bit-identical** to the pre-change build across the full positive domain. Concretely: sweep `t ∈ {0.55, 0.6, …, 1.0}`, hold all other terms at the `verify_S1.js` `base` context, and require exact float equality with the frozen pre-change values. Effective slope must remain **+12/unit** (8 × the 1.5 term weight). Also assert the *absolute score values*, not only the derivative — a preserved slope with a shifted intercept would still change every argmax. |
| **G16.2** | **Negative evidence becomes decision-usable** | (a) `∂score/∂t` is **nonzero and positive** throughout `t < 0.5`, so decreasing trust decreases score — sweep `t ∈ {0.0, 0.05, …, 0.45}` and require a strictly increasing score with slope +12/unit. (b) **Behavioural, not merely analytic:** construct two candidates identical in every scoring input except trust — one *proven-bad* (`s=0, a=10` ⇒ `t ≈ 0.083`) and one *neutral/untried* (`t = 0.5`) — and assert the proven-bad candidate **loses the argmax**. Assert it **wins or ties** under the pre-change build, demonstrating the gate detects a real behavioural change and is not vacuous. (c) Assert continuity at `t = 0.5`: score is exactly equal to the neutral baseline there, so the repair introduces no discontinuity. |
| **G16.3** | **No unrelated coefficients change** | Every other term derivative is **bit-unchanged**, reusing the `verify_S1.js` S1.3a machinery over the full `NEG ∪ POS` term set. Additionally: `lastArbitrationBreakdown` bit-identical across ≥ 20 000 contexts (the S1.7 check), and the module export surface unchanged (the S1.8 check). |
| **G16.4** | **The modification is isolated and auditable** | (a) `git diff` against the pre-change file touches **exactly one line** and removes exactly the `Math.max(0, …)` wrapper — asserted by diff parsing, not by eye. (b) No other file in `render/` is modified. (c) A frozen pre-change copy of `scoring.js` is committed under `experiments/m7/baseline/` as a **reference arm only, never a substitute** — guarding against the Phase 0 D11 anti-pattern, exactly as M1 did. (d) The live module under test is imported from `render/scoring.js`, never from the frozen copy. |
| **G16.5** | **M1 regressions remain valid** | `verify_S1.js` (12/12) **and** `verify_S1b.js` (4/4) both re-run green against the modified `scoring.js`, from `experiments/phase1_0`. **This is expected to require care:** M1's gates compare against `baseline/scoring_prefix_D3.js` and `baseline/scoring_termarray_preflip.js`, whose `bayesianTrust` behaviour is the *rectified* form. Any M1 assertion that implicitly depends on rectification must be identified and reported to the Director **before** being altered — an M1 assertion may not be weakened to accommodate M7. If an M1 assertion genuinely conflicts, that is a finding requiring a ruling, not a fix. |

**Anti-vacuity requirement, applying to the whole gate.** G16.2(b) and G12(d) share a principle worth stating once: a gate that passes both before and after the change proves nothing. Every G16 assertion that claims to detect the repair must be **demonstrated to fail against the pre-change build**. The gate reports both runs.

**Scope limit.** G16 verifies the *repair*. It makes no claim about whether the repaired term improves agent performance — that is the M7 experiment's question, and answering it inside a verification gate would be circular.

---

## 16. Expected outcomes

Stated in advance, as a discipline against post-hoc narrative.

| Outcome | Prior | Reasoning |
|---|---|---|
| Link ① holds (belief updates) | **High** | Mechanism exists and is coherent (§3.3) |
| Link ② holds (calibration ρ > 0.3) | **Moderate–high** | Beta-Bernoulli is the correct conjugate estimator for `p_e` once re-keyed — provided visit counts do not dominate |
| Link ③ holds (flip rate > 1%) | **Moderate** | Under the symmetric form mandated by Ruling Q1, the term is ±12/unit and applies across the whole domain — substantial in score units, but competing against Q values an order of magnitude larger (§16 closing paragraph) |
| Link ④ holds (conditional advantage > 0) | **Uncertain — the real test** | With no look-ahead (D2, §3.4) the agent uses belief for one step only. Whether one-step avoidance suffices on a 20-node graph is genuinely unknown |
| Link ⑤, W1/W3 (early / post-shift) | **Uncertain** | The window where belief should beat Q on speed |
| Link ⑤, W4 (asymptote) | **Expected null** | H1 predicts Q catches up. Pre-registered as expected |
| Survives SHUFFLED (F-5) | **Uncertain — decisive** | If it fails, the effect was never informational |
| Survives AGGREGATE-ONLY (F-6) | **Uncertain — decisive** | Distinguishes per-edge belief from global arousal |
| ORACLE ≫ ABLATION (F-11) | **Must hold or the experiment is void** | Check this first |

**The most likely single outcome, honestly stated:** links ① and ② hold; link ③ is weak because the belief term competes against Q values an order of magnitude larger in score units; link ④ is inconclusive at the pilot sample size. That outcome is **informative** — it would locate the failure precisely at "the belief channel is wired but under-weighted relative to Q," which is a specific, testable, and repairable finding rather than a vague negative.

---

## 17. Interpretation matrix

Read the first row that matches. `✓` = criterion passed, `✗` = failed, `—` = not evaluated at that row.

| ② calib | ③ flip | ④ cond. adv | vs A6 SHUF | vs A5 AGG | ⑤ W3 shift | **Interpretation** |
|---|---|---|---|---|---|---|
| — | — | — | — | — | **A7 ≈ A2** | **Experiment void.** Environment does not reward reliability knowledge. Redesign §6. No conclusion about MiniFlyWire. |
| ✗ | — | — | — | — | — | **Belief does not track the world.** Estimator or wiring failure. Report, diagnose, do not claim. |
| ✓ | ✗ | — | — | — | — | **Belief is informative but inert.** Same class of defect as the nine NOT-USED components — now with a live referent. Repair target: relative weight of the trust term. |
| ✓ | ✓ | ✗ | — | — | — | **Belief changes decisions but changes them for the worse or neutrally.** A genuinely interesting negative: the channel exists and misleads. |
| ✓ | ✓ | ✓ | **✗** | — | — | **Not informational.** An exploration-perturbation effect. **No cognitive claim.** |
| ✓ | ✓ | ✓ | ✓ | **✗** | — | **Global reliability signal only.** Real but coarse: the agent knows the world got worse, not which edge is bad. Weaker claim, honestly stated. |
| ✓ | ✓ | ✓ | ✓ | ✓ | **✗** | **Ordinary RL.** Q absorbs `p_e` equally fast. **H-B not excluded.** |
| ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **H1-strict supported.** The narrow operational capability of §2.1 is demonstrated for one-step transition beliefs, at `(A1−A2)/(A7−A2)` of oracle-attainable gain. **Scope: one-step only; no planning (D2); one hidden-variable family; one graph.** |

### 17.1 The claim ceiling *(Director Ruling, 2026-08-19 — BINDING)*

**M7 must not be described as proving general cognition, intelligence, consciousness, planning, or discovery.**

The strongest claim permitted by the Director, even if every criterion in the bottom row passes, is:

> **A calibrated internal model of a hidden environmental property causally influencing action selection and adaptation.**

Scoped to this system, that reads in full:

> *MiniFlyWire maintains a calibrated internal model of a hidden per-edge transition property; that model causally changes which action it selects on the immediately following step; and the changed selections measurably improve subsequent outcomes and post-shift re-adaptation — on one 20-node graph, for one hidden-variable family, with one-step use only and no planning (D2 unrepaired, Ruling Q4), with the prediction-error learning-rate pathway pinned (Ruling Q2), and at a realised fraction `(A1−A2)/(A7−A2)` of oracle-attainable gain.*

**Words that may not appear in any M7 artifact as a description of the result:** cognition (unqualified), intelligence, consciousness, understanding, planning, reasoning, discovery, emergence, self-awareness. **Words that may appear, because the design measures them:** calibrated, causal, belief (in the §2.1 operational sense, defined at first use), adaptation, one-step.

This ceiling binds the abstract, the README, any commit message, and any external communication — not merely §17.

---

## 18. Gemini adversarial-review questions

Gemini Pro has **not** reviewed this document. Nothing here is approved. These are the attacks the design must survive; each names the section that attempts a defence, so the reviewer can go straight at the weakest point.

**Novelty**
1. Beta-Bernoulli estimation of edge reliability is textbook. What, precisely, is claimed as novel — and is "falsification methodology applied to a specific audited artifact" an honest framing, or a retreat? (§13.1)
2. Is any result here transferable beyond this one 20-node graph and this one hidden-variable family? If not, should the title say so?

**Circularity**
3. The environment's hidden variable is Bernoulli; the estimator is Beta-Bernoulli. Is §13.1's defence — that the current wiring estimates the wrong quantity, so the fit is not free — sufficient? Or is this still "designing the lock to fit the key"?
4. Would an equally minimal *non-conjugate* hidden variable (hidden edge cost, or a hidden reward multiplier) have been a fairer test? Should M7 include one?

**Experimental validity**
5. Is ABLATION (A2) genuinely belief-free after §3.8's second pathway and §13.2's pinning — or does some third route remain that this audit missed?
6. §13.2 pins `learningAuthority ≡ 1.0` and disables `dampQ` in **all** arms. Does that manipulation make the baseline agent unrepresentative enough to void the comparison?
7. With planning severed (D2, `futureBonus ≡ 0`, measured), is a one-step belief test worth running at all — or is the honest answer that MiniFlyWire cannot express belief-driven behaviour until D2 is repaired?
8. Is excluding the measured 4.5% stale-execution steps (§3.9) a legitimate pre-registered exclusion, or does it discard exactly the steps where the belief/action mismatch matters most? Does §11's "Exclusion transparency" clause — which treats a sign or verdict disagreement between filtered and unfiltered results as invalidating the exclusion — actually close this, or merely document it?

**Confounds and leakage**
9. Do constraints R1–R5 actually prevent the goal-gradient and semantic-similarity terms from proxying for `p_e`? Which additional observable could still leak?
10. Slips consume a tick and trigger the existing `agentLast === next` repetition penalty. Is that a hidden reward-design artifact despite §6.5's "no new reward code"?
11. Does the reliability shift at t=1500 confound "re-adaptation speed" with "distance from the prior"?

**Statistics**
12. Is clustering by configuration sufficient, or does within-run temporal autocorrelation still inflate significance?
13. Is `(A1−A2)/(A7−A2)` a well-behaved effect measure when the denominator is small or its CI crosses zero?
14. Are three Holm-corrected primary comparisons the right family, given seven arms and four windows?

**The core question**
15. If every criterion passes, is the §17 bottom-row sentence *still* an over-claim? What weaker sentence would you accept?
16. Is there a simpler explanation — a bandit, a visit-count heuristic, an exploration-temperature change — that this design cannot exclude?
17. **What single additional arm or metric would most increase your confidence in a positive result?** (The design should adopt it.)

---

## 19. What would make us abandon this direction?

Stated in advance, so it cannot be renegotiated after the data arrive.

**Abandon M7's design and redesign the environment if:**
- **F-11 fires** (ORACLE ≈ ABLATION). A perfectly-informed agent gains nothing ⇒ the environment does not reward reliability knowledge and no result means anything.
- Gates G11 or G13 cannot be satisfied by any configuration ⇒ the 20-node graph cannot support a hidden variable that is both non-leaky and decision-relevant. **The graph, not the agent, is the limit.**

**Abandon the belief direction for MiniFlyWire — and report that as the Phase 1.0 result — if:**
- **F-1 fires** and diagnosis shows `trust_e` tracks visit counts rather than `p_e` even after the §7.2 re-keying. The estimator estimates the agent, not the world.
- **F-2 fires under 7.3-A.** With a symmetric ±12/unit term and a genuinely calibrated belief, a flip rate below 1% means the belief term is structurally dominated by Q. The conclusion would be architectural: *belief cannot compete with value in this scorer at any reasonable weight* — and raising the weight to force flips would be tuning-to-win, which §18 Q16 would rightly destroy.
- **F-5 fires.** SHUFFLED matches BELIEF ⇒ any measured gain was exploration perturbation. This is the cleanest possible refutation and should end the direction without argument.

**Abandon the *claim* while continuing the work if:**
- F-7 fires (ordinary RL recovers as fast). Then the honest report is: *"the environment is learnable, and model-free RL learns it as well as the belief mechanism does."* That is a real Phase 1.0 result and should be published as such rather than rescued by adding mechanisms until a difference appears.

**Do NOT abandon merely because:**
- W4 (asymptote) shows no difference — **H1 predicts this** (§9.4).
- The effect is small. A small, calibrated, replicated, oracle-bounded effect is a scientific result. A large unbounded one would be more suspicious, not less.
- The result is negative. Phase 0 concluded the system is not cognitive; a negative M7 confirming that the minimum missing mechanism does *not* suffice is exactly as informative as a positive one, and considerably more likely.

**Escalation rule.** If **three or more** of F-1…F-10 fire, do not iterate on M7. Return to the Director with the position that one-step transition belief is the wrong minimal mechanism for this architecture, and that the D2 planning repair — or hidden *reward* rather than hidden *dynamics* — is the better next candidate. Iterating an experiment until it passes is how a null result gets laundered into a positive one, and this project has spent six milestones building the instrumentation to avoid exactly that.

**The D2-shaped failure, named in advance (Ruling Q4).** There is one specific pattern that should be read as *"the one-step scope was the limit,"* not *"belief does not work"*: **F-1 passes and F-2 passes, but F-3 fails** — belief is calibrated, it does change decisions, and the changed decisions do not improve outcomes. With no look-ahead, the agent can decline one unreliable hop but cannot route around an unreliable *region*, so a locally-better choice can still lead somewhere worse. If that pattern appears, the correct recommendation is **repair D2 and re-run M7 unchanged**, not to add a mechanism or reweight a term. Naming it here prevents it from being re-read after the fact as evidence against the belief hypothesis.

---

## Director decisions — all six RESOLVED 2026-08-19

The six questions this section previously posed have been ruled on. Original wording is preserved for provenance; the ruling and its effect are recorded alongside.

| # | Original question | Recommendation given | **Ruling** | Where it landed |
|---|---|---|---|---|
| **1** | **§7.3** — remove the `max(0, …)` rectification on `trustBonus`? | 7.3-A (remove) | **APPROVED in direction; implementation BLOCKED** pending gate G16 | §7.3, §14.3, **§15.1 (G16)** |
| **2** | **§13.2** — pin `learningAuthority ≡ 1.0` and disable `dampQ` in all confirmatory arms? | Yes, with the 2×2 factorial as secondary | **APPROVED**, explicit gate required. *(2026-08-19: the 2×2 factorial is further ruled **exploratory only**, with no pre-registered n.)* | §13.2, **G12 (tightened, with anti-vacuity control)** |
| **3** | **§3.9** — exclude replay-branch steps, or repair F2b first? | Exclude (measurement-only) | **Do not fix F2b.** Exclusion approved *provided the analysis makes it explicit* | §3.9, **§11 "Exclusion transparency"**, G8 |
| **4** | **§3.4** — confirm D2 stays unrepaired inside M7? | Yes, scope claims to one-step use | **KEEP D2 UNREPAIRED.** M7 is explicitly a one-step belief-use experiment | §3.4, §13.4, §17.1, §19 |
| **5** | **§3.11/X6** — correct the stale M5 status in the plan document? | Yes — Director action | **CORRECT IT** (documentation/provenance only) | **Executed**; §3.11/X6, and A7–A9 for what the correction surfaced |
| **6** | **§9.5** — approve the two-stage protocol and run budget? | Yes | **APPROVED.** n from the pre-registered Stage-1 power procedure; hard max 4200; **do not guess n before Stage 1** | §9.1, §9.5 |

**Additional standing rulings:** controls A1/A2/A5/A6/A7 locked (§8); claim ceiling fixed (§17.1).

---

## Remaining blockers before any implementation

| | Blocker | Owner | Status |
|---|---|---|---|
| **B1** | **G16 authored and Director-approved** (§15.1) — the five-property rectification gate | Engineer → Director | This document specifies it; **not yet implemented** |
| **B2** | Trust rectification implemented **only after** B1 green, with `verify_S1.js` + `verify_S1b.js` re-run green | Engineer | **Blocked by B1** |
| **B3** | [`M7_PREREGISTRATION.md`](M7_PREREGISTRATION.md) authored to the Ruling Q6 shape (procedure, not a number), then SHA-256 hashed | Engineer → Director | ✅ **CLEARED 2026-08-19 — FROZEN v1.0 and hashed.** SHA-256 `2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9`, recorded in [`M7_PREREGISTRATION.sha256`](M7_PREREGISTRATION.sha256). Verify with `cd research/cognitive-audit && sha256sum -c M7_PREREGISTRATION.sha256` |
| **B4** | Director approval to begin implementation of the §14 delta | Director | **Not given** |
| **B5** | Open item — milestone-numbering collision (§3.11/X9): this M7 vs. the plan's M7-Q2 | Director | Awaiting ruling; disambiguation note added, nothing renumbered |

---

## IMPLEMENTATION STATUS: NOT STARTED

**Source code, tests, and contracts: unmodified.** No `render/` module, no `main.js` line, no test, and no experimental mechanism has been changed. D2 is unrepaired, F2b is unrepaired, D8/F12 is unchanged, no scoring weight has been retuned, and the §7.3 rectification has **not** been implemented.

**Documents modified in this revision, both under explicit Director authorisation:** this specification (rev 2) and [`PHASE_1_0_IMPLEMENTATION_PLAN.md`](PHASE_1_0_IMPLEMENTATION_PLAN.md) (Ruling Q5, documentation and provenance only).

**Nothing committed. Nothing pushed.**

M7 implementation awaits: Director review of this revision → G16 authored and approved (B1) → rectification implemented and gated (B2) → pre-registration hashed (B3) → **explicit authorization from the project owner (B4)**.

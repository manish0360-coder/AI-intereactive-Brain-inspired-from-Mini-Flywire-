# M7 Gate-Semantics Audit — S1.7 and S3.2 under the approved trust rectification

**Status:** Evidence document. **No gate, source file, pre-registration, or sidecar was modified to produce it.**
**Date:** 2026-08-19
**Author:** Chief Systems Engineer
**Authority:** Director ruling of 2026-08-19 — "GATE-SEMANTICS AUDIT ONLY. Evidence first."
**Trigger:** G16 returned **RED (21 passed, 2 failed)** after the approved one-line trust rectification.

---

## 0. The question this document answers

The Director required a distinction between:

- **(A) a genuine regression** caused by the approved rectification — the change broke something that previously worked; and
- **(B) an old gate whose invariant is incompatible** with the intentionally approved M7 change — the gate encodes an assumption the repair was designed to invalidate.

**Result, stated up front: both failures are category (B). Neither is a regression.**

| Failure | Category | One-line reason |
|---|---|---|
| **S1.7 / G16.3b** — arbitration breakdown not bit-identical | **(B)** | S1.7 is a *change-isolation* assertion written for the M1/D3 sign repair. The M7 repair deliberately alters `trustBonus`, which is a summand of `confidenceScore` **by construction**. Exactly one of six fields changes, by exactly the approved amount. |
| **S3.2** — stale executions 17 → 26 | **(B)** | S3.2 is a **single-seed threshold on a policy-dependent quantity** whose residual is the deliberately-unrepaired F2b replay branch. The F2 repair itself is fully intact (0 stale under forced exploration, 6/6 seeds, both builds). The rectified build is **better on average** (mean 10.8 vs 16.3). The pre-rectification build fails the same threshold on a different seed. |

**A third finding, more consequential than either:** the frozen pre-registration contains an **internal contradiction** between §13.1 and §13.4/G16.3. It is unsatisfiable as written. See §6. It cannot be fixed by me — the document is immutable — and requires a Director erratum.

---

## 1. Original intent of S1.7

### 1.1 What it asserts

[`experiments/phase1_0/verify_S1b.js`](../../experiments/phase1_0/verify_S1b.js), gate S1.7. Its own label states the intent:

> `S1.7  arbitration breakdown identical across 20000 contexts (arbitrate() path unaffected)`

It calls `ORIG` (frozen `baseline/scoring_prefix_D3.js`) and `FIX` (live `render/scoring.js`) on 20 000 randomised contexts and requires `JSON.stringify(lastArbitrationBreakdown)` to match exactly.

### 1.2 What it was built to guarantee

S1.7 was authored as part of **M1 (D3)**. M1 rewrote `finalWeight` from a 90-line chained sum into an explicit signed term array and then **negated exactly five array entries**. The stated M1 discipline was *"NO COEFFICIENT WAS CHANGED. Only five signs."*

`lastArbitrationBreakdown` is a **separate diagnostic reporting structure** built at [`render/scoring.js:394`](../../render/scoring.js:394), downstream of and parallel to `finalWeight`. The M1 file header explicitly cites it as *evidence used to establish intent* — the breakdown classified `stressState` and `boredomPenalty` as costs while `finalWeight` was adding them, which is how the D3 sign defect was identified in the first place.

> **S1.7's purpose is therefore change-isolation, scoped to D3: prove that the five-sign repair to `finalWeight` did not leak into the `arbitrate()` diagnostic path.**

It is **not** a general-purpose invariant asserting that `lastArbitrationBreakdown` must never change for any reason. It held trivially before M7 for a specific structural reason (§3.1): under rectification, `trustBonus` was identically zero across the entire half-domain `t < 0.5`, so randomising `bayesianTrust` over `(0,1)` could not perturb it.

### 1.3 The randomisation that makes it bite

S1.7's context generator sets `bayesianTrust: R(0,1)` — uniform over the full domain. Roughly half its contexts therefore fall in `t < 0.5`, the half the M7 repair deliberately activates.

---

## 2. Original intent of S3.2

### 2.1 What it asserts

[`experiments/phase1_0/verify_S3.js`](../../experiments/phase1_0/verify_S3.js), gate S3.2:

```js
const PRE_STALE = 67, PRE_STEPS = 381;      // measured pre-fix, same seed/ticks
ok('S3.2  stale executions cut by >=70% vs the pre-fix baseline',
   lo.stale <= PRE_STALE*0.3, `${PRE_STALE} -> ${lo.stale}`);
```

`lo` is one agent run at **seed 20260818, ticks 80, natural epsilon**. The threshold is `stale ≤ 67 × 0.3 = 20.1`.

### 2.2 What "stale" actually measures

From [`_runonce.js`](../../experiments/phase1_0/_runonce.js):

```js
stale: Math.max(0, s - d)     // s = learning steps (diag.mqfTotal), d = lastReasoning writes
```

A step increments `steps`. A *fresh decision* increments `decisions` (every write to `window.lastReasoning`, which `runPrediction` performs at step 0). So:

> **`stale` = steps that executed without a fresh decision write = steps on which `runPrediction` did not run.**

The only mechanism producing that is the replay branch at [`main.js:3170`](../../main.js:3170) — `if (liveRng() < 0.92) { runPrediction(...) } else { replayOneEpisode() }`. **`stale` is, by construction, replay-branch occupancy weighted by learning steps.**

### 2.3 What it was built to establish

M5 repaired **F2**: the epsilon branch drew a random candidate, assigned it to a local variable, and `return`ed before `window.lastReasoning` was written — so the agent re-executed the *previous* step's decision and the exploratory choice was discarded. Pre-fix, that produced **67/381 (17.6%)** stale executions.

> **S3.2's purpose is to establish that the *epsilon-caused* component of staleness is gone**, leaving only the acknowledged non-epsilon residual.

The gate's own console output says exactly this, and names the residual:

```
residual cause: main.js takes the replay branch on ~8% of steps
(liveRng() < 0.92 else replayOneEpisode) and never calls runPrediction,
so lastReasoning is not refreshed. Separate defect; NOT in M5 scope.
```

**S3.2 therefore measures a quantity it openly acknowledges it does not fully control** — a residual driven by a defect (F2b) that M5 deliberately did not repair, and whose occupancy depends on the policy.

---

## 3. Exact causal source of each failure

### 3.1 S1.7 / G16.3b — structural derivation, then measurement

**Structural.** `trustBonus` occurs exactly three times in `render/scoring.js`:

| Line | Site | Role |
|---|---|---|
| 183 | `const trustBonus = (bayesianTrust - 0.5) * 8;` | definition (**the approved change**) |
| 358 | `['trustBonus', trustBonus * 1.5]` | term array → `finalWeight` |
| **411** | `trustBonus * 1.5 +` | **inside `confidenceScore`** |

The breakdown has six fields. **Exactly one — `confidenceScore` — contains `trustBonus`.** The other five (`rewardScore`, `semanticScore`, `curiosityScore`, `costScore`, `schemaScore`) cannot depend on it by construction.

**Measurement.** 20 000 randomised contexts, `bayesianTrust ~ U(0,1)`, both builds:

| Field | Contains `trustBonus` | # differ | of which `t < 0.5` | of which `t ≥ 0.5` |
|---|---|---|---|---|
| `rewardScore` | no | **0** | 0 | 0 |
| `semanticScore` | no | **0** | 0 | 0 |
| **`confidenceScore`** | **YES** | **9 997** | **9 997** | **0** |
| `curiosityScore` | no | **0** | 0 | 0 |
| `costScore` | no | **0** | 0 | 0 |
| `schemaScore` | no | **0** | 0 | 0 |

*(9 997 contexts had `t < 0.5`; 10 003 had `t ≥ 0.5`.)*

**The divergence is exactly the approved repair.** Writing `Δ = confidenceScore_post − confidenceScore_pre`:

```
trustBonus_pre  = 8·max(0, t − 0.5)
trustBonus_post = 8·(t − 0.5)
Δ = 1.5 · (trustBonus_post − trustBonus_pre) = 12 · min(0, t − 0.5)
```

Measured: **max |Δ − 12·min(0, t−0.5)| = 5.33 × 10⁻¹⁵** across all 20 000 contexts — floating-point noise.

**Causal source: the approved rectification, propagating into a derived diagnostic field that contains the modified term by construction. Nothing else changed.**

### 3.2 S3.2 — A/B on the identical harness

To attribute the change causally I ran the **real `main.js`** against both scoring builds on the **identical harness**, using a scratchpad-only ESM resolve hook that redirects `render/scoring.js` to the frozen reference arm `baseline/scoring_prerect.js`. **No repository file was modified**; the redirect was verified live (score at `t = 0.0` returns `0` under the hook, `−6` without it).

**Seed 20260818, ticks 80 — the exact configuration S3.2 uses:**

| metric | PRE-RECT | POST-RECT | delta |
|---|---|---|---|
| ticks | 80 | 80 | 0 |
| decisions | 363 | 360 | −3 |
| steps | 380 | 386 | +6 |
| **stale** | **17** | **26** | **+9** |
| stale rate | 4.47% | 6.74% | |
| identical action sequence | — | **no** | policy changed, as intended |

**The decisive test — epsilon pinned high (`BOOST=1`), the condition F2 exists to fix:**

| seed | PRE-RECT stale | POST-RECT stale |
|---|---|---|
| 20260818 | **0** / 338 | **0** / 318 |
| 31337 | **0** / 324 | **0** / 324 |
| 31338 | **0** / 323 | **0** / 324 |
| 777 | **0** / 340 | **0** / 343 |
| 4242 | **0** / 328 | **0** / 327 |
| 90210 | **0** / 348 | **0** / 353 |

> **Zero stale executions under forced exploration, on 6/6 seeds, in BOTH builds.** If the rectification had re-broken F2, forcing exploration would produce many stale executions — the pre-F2-fix build produced **40.9%** under exactly this condition. It produces **0.0%**. **F2 is fully intact.**

**Seed sweep at natural epsilon (`BOOST=0`) — the quantity S3.2 thresholds:**

| seed | PRE-RECT | POST-RECT |
|---|---|---|
| 20260818 | 17/380 (4.5%) | **26/386 (6.7%)** ← S3.2's seed |
| 31337 | 17/385 (4.4%) | 4/380 (1.1%) |
| 31338 | 10/388 (2.6%) | 8/388 (2.1%) |
| 777 | 11/379 (2.9%) | 0/367 (0.0%) |
| 4242 | 14/378 (3.7%) | 7/380 (1.8%) |
| 90210 | **29/384 (7.6%)** | 20/385 (5.2%) |

| | PRE-RECT | POST-RECT |
|---|---|---|
| mean stale | **16.33** | **10.83** |
| sd | 6.86 | 10.01 |
| range | 10 – 29 | 0 – 26 |
| **seeds exceeding the 20.1 threshold** | **1 / 6** (seed 90210) | **1 / 6** (seed 20260818) |

**Three conclusions follow directly:**

1. **The rectified build is better on average** — mean stale 10.83 vs 16.33, a 34% *reduction*.
2. **The pre-rectification build also fails S3.2's threshold** — on seed 90210 it produces 29 stale, exceeding 20.1. The gate would have gone RED before M7 existed, on a different seed.
3. **Both builds fail at the identical rate: 1 of 6 seeds.** The threshold is not discriminating between builds; it is discriminating between seeds.

**Causal source: the approved rectification changes the policy (action sequences differ, as intended). A different policy visits the F2b replay branch a different number of times. S3.2 thresholds that visit count against a constant measured on one seed.**

---

## 4. Which parts are genuine regressions

**None.**

Every assertion that tests a property the rectification was supposed to preserve **passes**:

| Property | Gate | Result |
|---|---|---|
| Positive-side score bit-identical for all `t > 0.5` | G16.1a | PASS — 10 points, exact float equality |
| Positive-side slope unchanged at +12/unit | G16.1c | PASS — 12.000000000 |
| All 28 other term derivatives bit-unchanged | G16.3a | PASS |
| Export surface unchanged | G16.3c / S1.8 | PASS |
| Exactly one source line differs | G16.4a3 | PASS |
| No other `render/` module modified | G16.4b | PASS |
| M1 D3 sign semantics, coefficients, behaviour | verify_S1.js | **12/12 PASS** |
| M1 term-array parity | parity_termarray.js | **200000/200000 bit-identical** |
| M2/M3 Q-namespace | verify_S2.js | **14/14 PASS** |
| M4 seeded RNG | verify_S4.js | **12/12 PASS** |
| M6 pure accessor | verify_S6.js | **18/18 PASS** |
| F2 structural repair intact | S3.1a–c | PASS |
| F2 defect signature absent | S3.3 | PASS (6.7% → 0.0% pinned) |
| Seeded determinism | S3.5a–b | PASS |

**One behavioural change is real, intended, and must be recorded:** the rectification changes the agent's policy, so action sequences differ from pre-M7 runs. This is the entire purpose of the repair — a belief that cannot change behaviour is not a belief. It is not a regression, but it does mean **any measurement taken against the pre-rectification build is no longer directly comparable**, including S3.2's hardcoded `PRE_STALE = 67`.

---

## 5. Which parts are expected consequences of the approved M7 repair

| Observation | Expected? | Why |
|---|---|---|
| `confidenceScore` differs for `t < 0.5` | **Yes, necessarily** | It contains `trustBonus * 1.5` by construction ([scoring.js:411](../../render/scoring.js:411)). The repair changes `trustBonus` on exactly that half-domain. A repair that left this field untouched would mean the repair had not taken effect. |
| `confidenceScore` identical for `t ≥ 0.5` | **Yes** | The approved change is a no-op above the hinge. Confirmed on 10 003 contexts and by a 0.001-resolution sweep. |
| Five other breakdown fields unchanged | **Yes** | None contains `trustBonus`. Confirmed structurally and empirically. |
| Δ = 12·min(0, t−0.5) exactly | **Yes** | This is the analytic value of the change. Measured to 5.33 × 10⁻¹⁵. |
| Action sequences differ | **Yes** | The point of the repair. |
| Replay-branch occupancy varies | **Yes** | Policy-dependent; F2b is unrepaired by ruling. |
| Stale count varies by seed | **Yes — and it did before M7 too** | PRE range 10–29 across six seeds. |

---

## 6. Are the gates still scientifically valid for M7?

### 6.1 S1.7 — **valid intent, invalidated implementation**

Its *purpose* (change-isolation: the repair must not leak into unrelated diagnostic fields) remains exactly right for M7 and should be kept. Its *implementation* — blanket bit-identity of the whole breakdown — is no longer a correct encoding of that purpose, because one field is now legitimately in scope of the change.

**Verdict: the assertion must be narrowed, not weakened.** As written it cannot distinguish "the repair landed where it should" from "the repair leaked somewhere it should not" — it fails on both. That is a loss of discriminating power, which is the real cost of leaving it unchanged.

### 6.2 S3.2 — **weak invariant, and it was weak before M7**

S3.2 thresholds a **policy-dependent, single-seed** quantity whose residual comes from a defect it explicitly declines to fix. The seed sweep shows it fails on 1/6 seeds for *both* builds. It cannot distinguish "F2 broke" from "the policy changed" — which is precisely the discrimination it is being asked to make right now, and it gets the answer wrong.

**Verdict: S3.2 does not validly test what M5 needs tested.** The property that genuinely establishes the F2 repair is already present and is seed-robust: **S3.3** (stale rate does not track epsilon) and the epsilon-pinned zero-stale result. Those pass on 6/6 seeds in both builds.

### 6.3 The frozen protocol is internally contradictory — Director action required

This is the most consequential finding, and it cannot be resolved by me.

The **frozen** pre-registration (SHA-256 `2f12e309…f6b9`, immutable) mandates both of the following:

- **§13.1** — `trustBonus` **must** become `(bayesianTrust - 0.5) * 8`
- **§13.4 / G16.3** — *"`lastArbitrationBreakdown` bit-identical across ≥ 20 000 contexts"*

**These are mutually unsatisfiable.** §13.1 changes `trustBonus`; `confidenceScore` contains `trustBonus` by construction; therefore the breakdown *cannot* be bit-identical across contexts spanning `t < 0.5`. No implementation can satisfy both. G16 as frozen can never go green.

Per frozen §0.1, this is a **protocol deviation** and is reported rather than silently reconciled. Per frozen §0.1 the standing rule is *"fix the implementation to match this document — never amend this document to match the implementation."* **That rule cannot be followed here**, because the document is inconsistent with itself, not with the implementation.

**This defect was present at freeze.** It was not introduced by implementation. Discovering it required running the gate, which by design could only happen after the freeze — which is exactly the ordering the Director mandated, and the ordering that surfaced it.

**Options for the Director (not selected here):**

| | Option | Preserves original hash | Notes |
|---|---|---|---|
| **(a)** | Issue an **erratum addendum** in a separate file that supersedes the G16.3 breakdown clause with the §7.1 invariant, leaving `M7_PREREGISTRATION.md` and its digest untouched | **Yes** | Preserves the full audit trail and the "frozen before implementation" property of every other clause. **Recommended.** |
| **(b)** | Re-freeze as v1.1 with a new digest | No | Loses the property that the protocol predates the implementation for the amended clause — the exact thing the freeze was designed to guarantee |
| **(c)** | Leave the contradiction; accept G16 permanently RED | Yes | Blocks Phase 1.0 indefinitely; makes the gate uninformative |

---

## 7. Minimum replacement invariants — PROPOSED, NOT IMPLEMENTED

Neither is implemented. No gate file has been modified.

### 7.1 Replacement for S1.7 / G16.3b

Two assertions replacing one, **strictly stronger** than the original:

> **(i) Non-trust fields exact.** `rewardScore`, `semanticScore`, `curiosityScore`, `costScore`, `schemaScore` are **bit-identical** between pre- and post-rectification builds across ≥ 20 000 randomised contexts.
>
> **(ii) Trust field exact-delta.** For `confidenceScore`:
> ```
> confidenceScore_post − confidenceScore_pre  ==  12 · min(0, bayesianTrust − 0.5)
> ```
> to within 1 × 10⁻¹² absolute, across the same contexts — including the requirement that the delta is **exactly 0** for every `bayesianTrust ≥ 0.5`.

**Why this is stronger, not weaker.** The original asserted only *"nothing changed."* The replacement asserts *"exactly the approved quantity changed, in exactly one field, by exactly the analytic amount, and nothing else moved at all."* It would catch a leak into any other field (i), a wrong coefficient (ii), a wrong hinge point (ii), or a change bleeding into `t ≥ 0.5` (ii) — none of which the original could detect once it started failing. It preserves S1.7's change-isolation purpose precisely.

**Anti-vacuity:** assertion (ii) must be demonstrated to **fail** against a build where the rectification was not applied (there Δ ≡ 0, violating the required nonzero delta for `t < 0.5`).

### 7.2 Replacement for S3.2

> **(i) The F2 invariant, seed-robust.** With epsilon pinned high, **`stale == 0` on every seed in a fixed panel** of ≥ 6 pre-registered seeds. *(Currently satisfied 6/6 on both builds; the pre-F2-fix build produced 40.9%.)*
>
> **(ii) The residual bound, distribution-based.** At natural epsilon, the **median** stale rate across the same fixed seed panel is **≤ 30% of the pre-fix baseline rate (17.6%)**, i.e. ≤ 5.3%. *(PRE median 4.1%, POST median 1.95% — both satisfy it; the pre-F2-fix build at 17.6% does not.)*

**Why:** (i) tests the causal mechanism F2 actually repaired — the epsilon path — and is invariant to policy. (ii) replaces a single-seed point threshold with a median over a panel, so ordinary policy-induced variance in F2b occupancy cannot flip the verdict, while a genuine regression in F2 still would. Both keep the ≥70%-reduction spirit of the original.

**Note on scope:** these are *replacement invariants for an M5 gate*. Frozen §13.5 states that **an M1 assertion may not be weakened to accommodate M7** and that any conflict requires a Director ruling. The same principle plainly extends to M5. **I have neither implemented nor weakened anything; §7 is a proposal awaiting ruling.**

---

## 8. Method and reproducibility

| | |
|---|---|
| Reference arm | `experiments/phase1_0/baseline/scoring_prerect.js` — byte-identical copy of `render/scoring.js` taken immediately before the rectification; differs from live by exactly one line |
| A/B technique | Scratchpad-only ESM `resolve` hook redirecting `render/scoring.js` → the reference arm, registered via `node --import`. **No repository file modified.** Redirect verified live (`score(t=0)` returns `0` under the hook, `−6` without) |
| Agent runs | Real `main.js` under `benchmarks/harness/headlessShim.js`, one OS process per run (ESM singleton), seeds as tabulated, 80 ticks |
| Scoring probes | `calculateDecisionScore` imported live; `curiosityState = 0` where determinism is required, making the internal `drift` term exactly 0 |

**Integrity confirmed at time of writing:**

```
M7_PREREGISTRATION.md: OK      (SHA-256 2f12e309…f6b9)
render/scoring.js:184          (bayesianTrust - 0.5) * 8;    ← rectification retained, not reverted
render/planning.js:357         neuron.id,                     ← D2 unrepaired
main.js:3170                   if (liveRng() < 0.92) {        ← F2b unrepaired
experiments/m7/                does not exist
```

Gate files `verify_S1b.js` and `verify_S3.js` are unmodified. No commit, no push. No pilot or confirmatory run executed.

---

## 9. Summary for the Director

1. **S1.7 / G16.3b is category (B).** Its purpose was D3 change-isolation. Exactly one of six breakdown fields changes, only on `t < 0.5`, by exactly `12·min(0, t−0.5)` (verified to 5.3 × 10⁻¹⁵). Five fields are untouched. **Not a regression.**
2. **S3.2 is category (B).** F2 is intact — **zero** stale executions under forced exploration on 6/6 seeds in both builds. The rectified build is **better on average** (10.83 vs 16.33). The pre-rectification build **also fails** this threshold, on seed 90210. **Not a regression.**
3. **No genuine regression was found anywhere.** Every preservation property passes; M1, M2/M3, M4, M6 and parity are all green.
4. **The frozen pre-registration is internally contradictory** (§13.1 vs §13.4/G16.3) and unsatisfiable as written. G16 can never go green in its frozen form. This requires a Director erratum; **recommended option (a): a separate addendum preserving the original digest.**
5. **Minimum replacement invariants are proposed in §7 and deliberately not implemented.**

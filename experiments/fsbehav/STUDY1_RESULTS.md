# FS-BD-01 Study 1 — Results (OQ-2)

**Status: FROZEN** by Director ruling on the Study 1 final disposition. The interpretation wording in §4, §8
and §8.1 is mandated and must not be restated more strongly. The derivation correction in §2 is frozen.

**Anchor:** `952c9fcf3123eb6e7ca2deab8247d2a99af541cf` · **A-OLD arm:** `782df6e` (read-only clone)
**Date:** 2026-09-21 · **Runs:** 24 (4 arms × 6 panel seeds) + 2 reproducibility spot-checks
**Seeds:** the six pre-declared S3′ seeds, unchanged. **No seed was created.** **Zero production changes.**
**Labels:** FACT / INFERENCE / HYPOTHESIS / OPEN QUESTION.

---

## 1. Arm and seed mapping

| Arm | Tree | Instrumentation |
|---|---|---|
| A-OLD | `782df6e` clone | none |
| A-V23 | `952c9fc` | none |
| A-GEO | `952c9fc` | `hook_geo.mjs` — `recordFor` forced to `{a:0,s:0}` (evidence neutralised; writes untouched) |
| A-FS0 | `952c9fc` | `hook_fs0.mjs` — `futureBonus` pinned to 0 |

Panel `[20260818, 31337, 31338, 777, 4242, 90210]`, `TICKS = 80`, `BOOST = 0` — identical to S3.2′(b).

## 2. The decisive source finding: the S3′ harness has no goal

**FACT.** `goalNeuronId` initialises to `null` (`main.js:1042`). The driver forwards a goal only when the
caller supplies one (`_driver.js:30`), and both `_runonce.js:6` and this study's runner call `boot({ seed })`.
The only runtime goal-assignment block (`main.js` ~3409-3417) is **commented out**.

**FACT (measured).** Across all V2.3 runs: 80/80 `futureBonus` samples = 0, `goalResets = 0`,
`discontinuities = 0`.

**INFERENCE.** With no goal, V2.3 `futureScore` returns `undefined` (F19) and the projection returns 0 (F29),
so **`futureBonus ≡ 0` for the entire run**. The pre-V2.3 mechanism, which did not require a goal, returned a
reward/curiosity-driven value with **median 20 — the old cap, saturated**.

**Correction to the Pass-1 derivation (stated, not buried).** Pass-1 §D predicted `FS = −d` via `c_hat ≡ 1`.
That reasoning assumed a goal exists. In this harness FS is **undefined** because there is no goal, so `c_hat`
is never consulted. The conclusion "learned evidence is inert here" stands; **the mechanism by which it is inert
was mis-derived** and is corrected here.

## 3. Primary results

| Arm | P1 stale rate (median) | P2 decisions/tick | P3 steps/tick | P4 stale ticks | S2 goal resets | S3 futureBonus median |
|---|---|---|---|---|---|---|
| A-OLD | **4.13%** | 4.606 | 4.819 | 24 | 0 | **20** |
| A-V23 | **5.55%** | 4.537 | 4.831 | 26.5 | 0 | **0** |
| A-GEO | 5.55% | 4.537 | 4.831 | 26.5 | 0 | 0 |
| A-FS0 | 5.55% | 4.537 | 4.831 | 26.5 | 0 | 0 |

**FACT.** A-V23's median of **5.55%** reproduces the S3.2′(b) value exactly, confirming the harness measures
the same quantity as the historical gate. A-OLD's **4.13%** sits below the 5.28% limit, consistent with S3′
passing at base.

## 4. The predicted null, and the ablation

**FACT.** **A-V23 ≡ A-GEO on all 6 seeds** — identical decisions, steps, stale, stale ticks, futureBonus
distribution and full write sequences. **The predicted null holds; the stop condition did not trigger.**

> **Bounded interpretation (Director ruling).** This demonstrates that **the learned-evidence path is inert in
> this particular no-goal S3′ harness**. It is **not** evidence that learned traversal evidence is generally
> irrelevant to V2.3.

**FACT.** **A-V23 ≡ A-FS0 on all 6 seeds.** Pinning `futureBonus` to 0 changes nothing, because it is already
0 — an internal consistency check confirming §2 behaviourally. The `hook_fs0` anchor matched exactly once, so
the ablation was genuinely applied.

> **Bounded interpretation (Director ruling).** This demonstrates **only that `futureBonus` is already zero in
> this harness**. It does **not** establish that FutureScore contributes nothing when a goal exists.

## 5. Paired contrast, A-V23 − A-OLD

| Seed | A-OLD | A-V23 | Difference |
|---|---|---|---|
| 20260818 | 0.00% | 6.98% | **+6.98pp** |
| 31337 | 4.40% | 2.64% | −1.77pp |
| 31338 | 3.86% | 9.84% | **+5.99pp** |
| 777 | 7.27% | 5.15% | −2.12pp |
| 4242 | 5.90% | 3.98% | −1.92pp |
| 90210 | 0.00% | 5.94% | **+5.94pp** |

- Median paired difference **+2.09pp**.
- **Exact sign test: 3 increases, 3 decreases, two-sided p = 1.0000.**
- **Exact bootstrap** (all 46 656 resamples): 95% interval for the median difference
  **[−2.02pp, +6.48pp] — spans zero**.

**FACT.** The direction is **not consistent across seeds**. The median moved largely because the two seeds that
were exactly 0.00% under A-OLD rose to ~6–7%, while three seeds **decreased**.

## 6. H3 — counter decomposition

| Seed | decisions OLD → V23 | steps OLD → V23 |
|---|---|---|
| 20260818 | 368 → 360 (−8) | 355 → 387 (+32) |
| 31337 | 369 → 369 (0) | 386 → 379 (−7) |
| 31338 | 374 → 348 (−26) | 389 → 386 (−3) |
| 777 | 357 → 368 (+11) | 385 → 388 (+3) |
| 4242 | 367 → 362 (−5) | 390 → 377 (−13) |
| 90210 | 379 → 364 (−15) | 362 → 387 (+25) |

**FACT.** Median change: **decisions −6.5, steps 0**. **INFERENCE.** Where the stale rate rose it did so mainly
through the **denominator of the decision count** — fewer `runPrediction` calls per tick with `updateQ` calls
roughly unchanged — not through a uniform rise in executed steps. **H3 is supported in this specific form** and
cannot be dismissed.

## 7. S1 — decision divergence

**FACT.** Trajectories diverge almost immediately: first divergence at decision **2–22**, and only **2.7%–7.2%**
of matched positions are identical. Removing a scoring term that was saturated at the cap changes the policy
comprehensively.

## 8. Falsification assessment

| Hypothesis | Verdict (frozen wording, Director ruling) |
|---|---|
| **H1 policy effect** | **"Evidence is consistent with a policy-induced change in the downstream stale measurement, but the six-seed paired comparison is inconclusive regarding a systematic directional increase."** The arms differ only in decision policy and the policy change is large (§7), but the per-seed contrast is 3 up / 3 down with an exact sign-test p of 1.0000 and a bootstrap interval spanning zero (§5). |
| **H2 mechanism effect (learned evidence)** | **"H2 is unobservable in Study 1 because learned traversal evidence is never consulted."** It is **not** falsified and **not** excluded generally. |
| **H3 counter decomposition** | **Retained.** The observed stale-rate difference is better decomposed through decisions/tick and steps/tick than through the ratio alone (§6). |
| **S3.2′(a) = 0/6** | Unchanged. **This is not proof that V2.3 is correct**; it is the policy-invariant causal F2 check continuing to hold. |

**Explicitly not written:** "H1 is confirmed", "H1 is statistically supported", "V2.3 increases stale rate".
**Not claimed:** that V2.3 is better or worse; that S3.2′(b) is falsified; that OQ-1 has been answered.

### 8.1 Status of S3′ as an instrument (frozen conclusion)

**S3′ is not a valid environment for testing the learned-evidence contribution of V2.3.** It remains a
**downstream behavioural/compatibility observation, not a FutureScore mechanism evaluation.** Any future claim
about the learned-evidence contribution must come from an environment with an active goal and non-degenerate
traversal evidence — never from this gate.

## 9. Reproducibility and provenance

**FACT.** Both spot-check reruns reproduced their output hashes exactly. Evidence: 24 per-run JSON files +
`RUNS.json` + `INTEGRITY.sha256` in `experiments/fsbehav/evidence/`, each record carrying arm, commit label,
seed, boost, ticks, counters, futureBonus quantiles, the full write sequence, Node version and an output hash.
The analysis consumes **no RNG** (the bootstrap enumerates all 6⁶ resamples exactly).

## 10. Threats to validity

1. **The measured configuration has no goal.** Post-V2.3, S3.2′(b) therefore measures an agent for which
   FutureScore is definitionally inert — see OQ-A below.
2. `stale = max(0, steps − decisions)` discards sign; compensating movement can hide inside it.
3. `steps` counts `updateQ` calls, not traversals.
4. The panel is declared non-naive; n = 6; 80 ticks may not reach steady state.
5. A-OLD differs by commit, not mechanism alone, though only `main.js` and `render/planning.js` differ
   materially.
6. jsdom/driver fidelity differs from a browser.

## 11. Open questions

- **OQ-A (new, and the most consequential).** Since V2.3 makes `futureBonus ≡ 0` without a goal, the post-V2.3
  S3.2′(b) figure characterises *the agent without FutureScore*. Whether that configuration is scientifically
  meaningful for this criterion is a question for the Director.
- **OQ-B.** Why does removing a saturated, goal-independent bonus change trajectories so comprehensively
  (§7)? Not investigated here.
- **OQ-1 (unchanged).** Whether learned traversal evidence adds information beyond geometry — untouched by this
  study and still requiring a goal-bearing, failure-producing environment (Study 2, NO-GO).

## 12. Study 2 — reformulated question (recorded, NOT designed here)

The Director has reformulated the next question as:

> **"When an active goal exists and traversal outcomes contain failures, does learned traversal evidence provide
> incremental decision information beyond geometric goal distance?"**

Its required conceptual ingredients, recorded for the future Pass-1 design task and **not** elaborated now:
active goal · failure-producing environment · non-degenerate `c_hat` · geometry-only condition ·
geometry + learned-evidence condition · same-state counterfactual evaluation · registered seed governance.

**Status: NOT STARTED.** No design, no implementation, no seeds, no runs, and the same-state counterfactual is
not implemented. Study 2 awaits a separate Director ruling after review of this frozen record.

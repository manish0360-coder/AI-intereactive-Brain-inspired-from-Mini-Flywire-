# Independent Scientific Review Report: CF-03c and CF-04

**To:** MiniFlyWire Project Maintainers & Architecture Review Board

**From:** Independent Principal Research Scientist and Adversarial Scientific Reviewer

**Subject:** Rigorous Evaluation of Experiments CF-03c and CF-04

---

## 1. Executive Verdict

Both experiments (`CF-03c` and `CF-04`) provide **valuable, high-rigor negative and boundary evidence** that successfully challenges previous architectural assumptions.

* **CF-03c Verdict: PARTIAL.** The world model's calibration claim does not generalize across arbitrary reliability distributions. It remains strictly valid only for the development generator (`U5`) and bimodal distributions. Calibration error (ECE) is correctly demoted as a headline metric in favor of Brier score decompositions.
* **CF-04 Verdict: ARBITRATION NOT SUPPORTED — HARMFUL.** Executive arbitration between the Bayesian planner and tabular Q-learning fails its criteria and actively degrades performance. When the planner is surprised, arbitration hands control to an incompetent fallback controller.
* **Overall Assessment:** The project's "freeze-then-run-once" methodological discipline is exemplary. However, previous conclusions were over-parameterized and relied on strawman baselines. MiniFlyWire must prune unproven cognitive modules (such as dual-controller arbitration) and refocus engineering effort on **recovery mechanics** (handling post-block re-exploration).

---

## 2. CF-03c Assessment: Calibration Robustness

* **Design Rigor:** Testing across four unseen reliability families (`WIDE`, `BIMODAL`, `ARCSINE`, `HIGH`) is a robust out-of-distribution challenge.
* **Findings:** The model failed calibration thresholds ($ECE \le 0.05$) on `WIDE` (0.055) and `ARCSINE` (0.055). Furthermore, a naive constant forecaster (`CONST`) achieved equal or better calibration error across all families.
* **Scientific Takeaway:** ECE measures alignment, not intelligence. V3's actual superiority lies in *resolution*, not calibration error. The decision to retain v3's structural repairs (fixed-point EM and CUSUM change detection) is justified because they successfully eliminate mathematical pathologies (e.g., $P(\text{stay}) > 1$) without penalizing performance on the development family.

---

## 3. CF-04 Assessment: Executive Arbitration

* **Design Rigor:** Task E4 introduces a clean hidden-change and reversal paradigm with a control arm (`SHAM`).
* **Findings:** Arbitration (`ARB`) performed significantly worse than the planner alone ($\text{Planner} - \text{ARB} = -13.8$ steps) and worse than random switching. The habit share remained high (14.2%) even during `SHAM` runs where nothing changed, indicating that switching was driven by noise rather than genuine environmental shifts.
* **Scientific Takeaway:** Dual-system arbitration is actively harmful when the secondary controller (tabular Q-learning) requires ~950 more steps to adapt than the primary planner. The hypothesis that arbitration helps under unexpected change is definitively falsified at this scale.

---

## 4. Baseline Fairness Assessment

* **Forecaster Baselines (`CF-03c`):** Highly fair and thorough. Comparing V3 against `CONST` (unconditional mean) and `LAPLACE` (unshared per-pair estimates) directly isolates the value of empirical-Bayes pooling.
* **Agent Baselines (`CF-04`):** **Unfair / Strawman.** Pairing a Leave-One-Out Bayesian Value-Iteration Planner with unaccelerated tabular Q-learning ($\alpha=0.5, \epsilon=0.1$) creates an extreme capability asymmetry. A model-free controller that takes 1,000 episodes to adapt is not a realistic cognitive fallback; it is an anchor. To fairly test arbitration, the model-free arm must use accelerated methods (e.g., Dyna-Q+).

---

## 5. Statistical Methodology Assessment

* **Power & Sample Size:** Sample sizes ($n=20$ for CF-03c, $n=55$ for CF-04) were formally derived from pre-registered power equations ($80\%$ power at $\alpha=0.05$). This prevents p-hacking and sample tuning.
* **Confidence Intervals:** 10,000-resample percentile bootstraps correctly treat the *world* as the independent unit of analysis, avoiding pseudoreplication across episodes.
* **Limitations:** Heavy-tailed step distributions and episode capping at 200 steps (with 233 capped episodes for QL) compress failure penalties, biasing group differences toward zero.

---

## 6. Implementation and Source-Code Concerns

1. **Cusum Constants:** The change-detection parameters (`changeHazard = 0.002`, `changeAlt = 0.9`) were set *a priori* but lack sensitivity analyses in the repository.
2. **Episode Truncation Bias:** Capped episodes returning static maximum step counts distort the mean performance of failing agents. Median survival metrics should accompany step counts.
3. **Fixed-Point Iteration Limits:** `emIterations = 25` is hardcoded; while sufficient for convergence in tested worlds, convergence checks should be explicitly logged in production traces.

---

## 7. Alternative Explanations

* **Why did BIMODAL pass while WIDE and ARCSINE failed in `CF-03c`?** The model assumes a single Beta population. In `BIMODAL`, edge probabilities cluster tightly around two distinct modes (0.95 and 0.55), which happens to align well with the model's empirical-Bayes shrinkage bounds when $S$ is small. In `WIDE` and `ARCSINE`, uniform/sinusoidal dispersion violates the implicit assumption of unimodal exchangeability, reducing resolution relative to unshared Laplace estimates.
* **Why did arbitration fail in `CF-04`?** Arbitration failed not because the arbitration concept is flawed, but because **false-positive handoffs** occurred frequently due to noise (14.2% habit share on `SHAM` runs). Every time noise triggered a handof, control was surrendered to a sub-optimal policy, squandering the planner's progress.

---

## 8. Recommended Next Experiment (`CF-05`)

1. **Objective:** Evaluate directed exploration and recovery mechanics rather than executive arbitration.
2. **Design:** Implement a **recency/exploration bonus** (or count-based novelty penalty à la Dyna-Q+) directly inside the planner's value computation (`cognitive/core/planner.mjs`).
3. **Task:** Task E4 (specifically measuring Phase D: recovery after a block is removed, where the planner currently lags 40 steps behind the ORACLE).
4. **Baseline:** Compare against a standard Dyna-Q+ baseline with a count model.

---

## 9. Recommended Architecture Decisions

* **Abandon:** Executive arbitration (`cognitive/mind/arb/`) and ECE as a headline metric. Remove them from the active build path.
* **Retain:** World model v3 (`cognitive/mind/v3/`) and value iteration planner (`cognitive/core/planner.mjs`).
* **Refine:** Restrict the model's calibration claims to development-like generators (`U5`) or homogeneous sub-populations.

---

## 10. Prioritized Action Plan

| Priority | Action Item | Target Component | Expected Outcome |
| --- | --- | --- | --- |
| **1** | **Prune Arbitration Code** | Remove `cognitive/mind/arb/` from active integration plans. Record AD-2 as falsified. | Prevents architectural bloat. |
| **2** | **Implement CF-05** | Add a recency/novelty exploration bonus to the value iteration planner. | Resolves the Phase D recovery deficit (+40 step gap). |
| **3** | **Deploy Dyna-Q+ Baseline** | Build a standard count-model Dyna-Q+ baseline for future model-based vs. model-free contrasts. | Ensures fair model-free comparisons. |
| **4** | **Update Documentation** | Amend architectural specs to reflect generator-specific calibration limits. | Maintains scientific conservatism and integrity. |
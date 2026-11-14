# Independent Principal Research Scientist Review: CF-05 & CF-05b

**To:** Project Maintainer & Architecture Board

**From:** Independent Principal Research Scientist and Adversarial Scientific Reviewer

**Subject:** Pre-Freeze Evaluation of CF-05 (Exploration Bonus) and CF-05b (Targeted Recall)

---

## Executive Summary & Architectural Position

Reviewing the provided complete pre-freeze package (`CF-05` and `CF-05b` specifications, architectural history, and underlying testbed artifacts), I confirm that both candidate mechanisms address a genuine, quantified deficit: **the post-reversal planning deficit** where the incumbent model leaves ~40 steps on the table because it never re-tests a dead exit.

However, the two mechanisms diverge sharply in utility, biological plausibility, and scientific defensiveness:

* **CF-05 (Exploration Bonus) is a confirmed null/harmful result.** Both blanket decay and parameter-tuned exploration bonuses either fail to recover performance or catastrophically explode step counts under extended evaluation.
* **CF-05b (Targeted Recall) is scientifically promising but operationally bounded.** It successfully trades off performance: it recovers 18.6 steps after a reversed change, but incurs a permanent-change tax of +8.2 steps, brushing against the strict 10-step gate margin.

### Decision on Scale: Node Count (20 vs. 40 Nodes)

**Do NOT increase the world size to 40 nodes yet.** Maintain 24/20 nodes.

* *Reasoning:* A cognitive architecture must demonstrate robust, pristine operational mechanics at a lower scale before absorbing the combinatorial complexity and variance of larger graphs. If a recovery mechanism cannot be cleanly isolated and proven on 24 nodes (where the planner baseline is well-characterized), scaling up only obfuscates confounds with statistical noise. Optimize the 24-node cognitive loop until it achieves 90%+ deterministic fidelity, then scale.

---

## Detailed Review of Questions 1–10

### 1. CF-05 predicts NOT SUPPORTED from development results. Is it still scientifically worthwhile to run its confirmatory gate? What would we learn?

* **Verdict:** **FAIL** (for running the full gate as a confirmatory exercise) / **PASS** (as a documented negative finding).
* **Supporting Source Evidence:** Development data show BONUS 0.001 performs virtually identically to MBVI3 on `return` ($-1.4$ steps, interval spans zero: $[-8.4, 4.7]$) while stronger settings like BONUS 0.003 degrade overall performance by $+61.8$ steps.
* **Technical Reasoning:** Spending 60 fresh worlds (`gate5`) to confirm a predicted null is an inefficient use of compute. We already know that uniform exploration bonuses or blanket belief decays are too blunt for structured graph navigation—they incentivize re-testing unpromising paths indiscriminately.
* **Required Changes:** Cancel or formally archive the full 60-world run of CF-05 as a **negative finding**, updating the ledger to state that blanket exploration bonuses are insufficient for structural recovery.

---

### 2. Is CF-05b's targeted recall mechanism genuinely recovering from reversed environmental changes, or is it primarily correcting false alarms from change detection?

* **Verdict:** **PARTIAL**.
* **Supporting Source Evidence:** The specification introduces two brilliant diagnostic arms (`RECALL_REALONLY` and `RECALL_FALSEONLY`) designed precisely to pull apart true recovery from false-alarm mitigation.
* **Technical Reasoning:** Because the v3 change detector occasionally triggers false positives on stable edges (throwing away valid historical counts), any mechanism that blends past beliefs back into the planner will inadvertently repair those false alarms. Without the diagnostic split, we cannot claim true "environmental recovery."
* **Required Changes:** The gate **must not** be approved or interpreted without successfully executing and reporting the `REALONLY` vs. `FALSEONLY` breakdown. If `FALSEONLY` carries the majority of the phase-D benefit, the mechanism must be re-categorized as a *change-detector patch*, not a memory/recall system.

---

### 3. The recall setting 0.01 was selected on a new 20-world tuning set. Is the subsequent 60-world (40-world) confirmatory test sufficiently independent?

* **Verdict:** **PARTIAL**.
* **Supporting Source Evidence:** The tuning set (`cf|tune5b|world|0…19`) selected hazard $0.01$ out of three choices ($0.003, 0.01, 0.03$) based on a minimum sum over CHANGE, SHAM, and PERMANENT arms. The confirmatory test uses 40 fresh worlds (`gate5b`).
* **Technical Reasoning:** A best-of-three parameter selection on a tuning set introduces mild selection bias (optimism bias). While a 40-world fresh domain provides out-of-sample protection, the hyperparameters are technically "tainted" by the tuning pass.
* **Required Changes:** Explicitly acknowledge the tuning lineage in the results record. Do not treat the 40-world run as a pure de-novo discovery, but rather as an *out-of-sample validation* of a hyperparameter selected via an independent grid.

---

### 4. Is the permanent-block cost of +8.2 steps acceptable relative to the 18.6-step recovery benefit?

* **Verdict:** **PARTIAL**.
* **Supporting Source Evidence:** Tuning results show an 18.6-step recovery benefit ($\text{CHANGE}$) vs. an 8.2-step tax ($\text{PERMANENT}$, with a 95% upper bound of 10.8, which breaches the strict $<10$ rule for criterion R4).
* **Technical Reasoning:** Whether a cost is "acceptable" is an architectural policy decision. Statistically, the upper bound violates the rigid threshold pre-declared in R4. Ecologically, if an agent operates in an environment where environmental changes reverse frequently (volatility > permanence), an 8-step tax is a bargain for an 18.6-step recovery. If changes are permanent, it is a net drain.
* **Required Changes:** Do not reject the mechanism outright over a minor rule violation of R4, but formally re-classify the verdict as **SUPPORTED AT A COST**, leaving the final deployment call to an environmental statistics profile.

---

### 5. Should the decision use a predefined mixture of temporary and permanent environmental changes rather than a fixed 10-step cost margin?

* **Verdict:** **PASS**.
* **Supporting Source Evidence:** The current gate treats CHANGE, SHAM, and PERMANENT as three isolated arms evaluated against rigid, independent margins.
* **Technical Reasoning:** Real agents do not operate in pure 100% temporary or 100% permanent worlds. Evaluating performance as a weighted expected utility over a mixture distribution (e.g., $p(\text{reversal}) \times \text{Benefit} - (1-p(\text{reversal})) \times \text{Cost}$) is mathematically superior to arbitrary step caps.
* **Required Changes:** In future architectural evaluations, replace the binary pass/fail cost margins with an **expected net utility metric** parameterized by environmental volatility $\alpha$ (the probability that a blocked path will eventually reopen).

---

### 6. Are the three additional diagnostic arms sufficient to isolate genuine recall from false-alarm correction?

* **Verdict:** **PASS**.
* **Supporting Source Evidence:** `RECALL_REALONLY`, `RECALL_FALSEONLY`, and the core `RECALL` arm explicitly separate ground-truth interventions from internal model artifacts.
* **Technical Reasoning:** By feeding ground-truth manipulation markers to the privileged diagnostic arms, the experiment cleanly orthogonalizes "fixing the change detector" from "remembering past world states."
* **Required Changes:** None. This is an exemplary design choice that other AI engineering frameworks should emulate.

---

### 7. Are the 48-node comparisons appropriately designed and interpreted as separate scaling evidence?

* **Verdict:** **PASS**.
* **Supporting Source Evidence:** Both CF-05 and CF-05b specifications include a larger-world repetition (48 nodes, 60 edges, 1,200 exploration steps, 20 worlds) as a reported (non-criterion) stress test.
* **Technical Reasoning:** Keeping scaling runs out of the gate-passing criteria is correct. Larger state spaces introduce path-length variance that can swamp small effect sizes; treating them as qualitative scaling evidence prevents premature architectural rejection.
* **Required Changes:** Ensure that the 48-node runs log memory footprints and convergence rates alongside step counts to verify how state-space scaling impacts tabular recall tables.

---

### 8. Are the Dyna-Q+ baseline, computational budgets and existing planner comparison fair?

* **Verdict:** **PASS**.
* **Supporting Source Evidence:** CF-05b compares RECALL against a count-model Dyna-Q+ baseline run both at its default budget ($k=20$) and matched to the planner's exact computational load ($k=1,300$ backups/decisions).
* **Technical Reasoning:** Previous iterations compared model-based planners against unaccelerated tabular Q-learning, which was an unfair strawman. Matching computational work ensures that any performance delta reflects genuine algorithmic superiority rather than raw compute asymmetry.
* **Required Changes:** None. Computational parity matching is methodologically rigorous.

---

### 9. Are there implementation defects, information leakage, selection bias or statistical weaknesses?

* **Verdict:** **PARTIAL** (Minor structural risks).
* **Supporting Source Evidence:** RECALL stores historical predictions upon a "got worse" change detection signal and fades them using a temporal decay hazard ($0.01$) tied to steps since last try.
* **Technical Reasoning:**
* *Information Leakage:* The diagnostic arms (`REALONLY`, `FALSEONLY`) are explicitly privileged and use task ground-truth; as long as they are strictly segregated from the production `RECALL` arm, no leakage occurs.
* *Statistical Weakness:* The sample size $n=40$ for CF-05b is well-powered for the benefit metric, but the cost criteria remain vulnerable to variance if permanent-block variances are fat-tailed.


* **Required Changes:** Ensure that truncation counts (capped episodes at 200 steps) are explicitly factored into median calculations so that agents hitting hard limits do not skew mean step efficiencies.

---

### 10. What is the most scientifically defensible next experiment?

* **Verdict:** **CF-05b Execution with Diagnostic Isolation**.
* **Technical Reasoning:** Abandon CF-05 (exploration bonuses are dead ends on this testbed). Proceed to freeze and execute CF-05b *only* after verifying that the `REALONLY` and `FALSEONLY` diagnostic arms are fully wired to isolate memory recall from change-detector repairs.
* **Required Changes:**
1. Formally record CF-05 as NOT SUPPORTED / ARCHIVED.
2. Approve CF-05b specification for freezing, subject to the condition that its final verdict incorporates the trade-off ratio revealed by the diagnostic arms.



---

## Final Architectural Assessment: Should RECALL Enter Production?

**Do not integrate RECALL into the production cognitive architecture yet.**

While CF-05b's targeted recall mechanism wins the reversal benchmark, it does so by introducing a stateful memory patch that violates the purity of the world model. A production cognitive architecture should not require ad-hoc "memory blending" to overcome sluggish re-exploration.

### The Fastest Scientifically Defensible Route Forward:

1. **Analyze the Diagnostics:** Run CF-05b and examine `REALONLY` vs. `FALSEONLY`. If the benefit is driven primarily by `FALSEONLY`, **scrap RECALL** and fix the root cause: the v3 change-detector's sensitivity matrix.
2. **Refactor the World Model:** Instead of maintaining a separate historical memory cache that decays over time, extend the world model's CUSUM change detector to maintain a multi-hypothesis transition distribution (active vs. latent background state).
3. **Stay at 24 Nodes:** Keep the testbed locked at 24 nodes until the core learning-recovery loop achieves theoretical closure without parameter-tuning hacks.
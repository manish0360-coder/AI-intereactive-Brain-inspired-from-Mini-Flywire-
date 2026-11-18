# Independent Scientific and Engineering Review: MiniFlyWire Experiment M13

**Review Reference:** GitHub public commit `3602576`

**Review Bundle:** `experiments/m13_generalization/review/M13_REVIEW_BUNDLE.md`

**Reviewer Role:** Independent Scientific and Engineering Reviewer

---

## Executive Summary & Independent Assessment

Experiment M13 tests whether the adopted belief agent (AD-13, "BELIEF") retains its net performance advantage over baseline MBVI3 when transferred without parameter tuning to a structurally distinct, previously unseen family of modular-ring worlds ($n = 165$ fresh graphs).

Following a rigorous audit of the specification (`SPEC.md`), proposal (`PROPOSAL.md`), implementation (`m13_lib.mjs`, `measures.mjs`, `worlds_modular.mjs`), raw output (`m13_result.json`), verification scripts (`verify_m13.mjs`, `check_measures_from_traces.mjs`), and statistical routines (`stats.mjs`), **no material defects were identified that invalidate the reported verdict lines or summary statement under the pre-declared rules.**

All five criterion verdict lines pass:

1. **Validity (G0):** `VALID`


2. **Net Advantage (G1):** `RETAINED` (+125.4 [92.0, 160.1])


3. **Safety (G2):** `SAFE` (RARE cost +9.8 [3.6, 14.9] against a pre-declared margin of 25)


4. **Recovery (G3):** `SHOWN` (+65.1 [50.9, 79.9])


5. **Behavioural Mechanism (G4):** `SHOWN` (+1.461 [1.255, 1.673])



**Summary Statement:** `NET ADVANTAGE RETAINED ON THE MODULAR FAMILY, WITHIN THE SAFETY MARGIN`.

---

## Detailed Evaluation by Question

### 1. Implementation Against Specification

* **Verdict:** Sound


* **Analysis:** Inspection of `run_m13.mjs`, `m13_lib.mjs`, and `measures.mjs` confirms that all criteria, bootstrap generation tags, strict inequalities (`mean > 0 && lower > 0`), and summary statement logic adhere strictly to `SPEC.md`.


* **Classification:** NOTE



### 2. Ground-Truth Isolation

* **Verdict:** Sound


* **Analysis:** Ordinary evaluation arms (`BELIEF` and `MBVI3`) receive no task context or ground truth. In `m13_lib.mjs` and `arms_v6.mjs`, context is passed exclusively to privileged diagnostic arms (`BELIEF_REALONLY` and `BELIEF_FALSEONLY`) to evaluate archive predicates (`archiveIf`), which are isolated from primary verdict criteria.


* **Classification:** NOTE



### 3. Held-Out Status and Choice of Family

* **Verdict:** Sound with qualifications


* **Analysis:** As self-identified by the study designer (`PROPOSAL.md` §2, `RESULTS.md` §11), the modular-ring family was not chosen at random; its selection was informed by M12 findings regarding detour costs (a heavier tail of long detours: 11% vs. 2%). However, it remains genuinely held out from development, as no agent ran on it prior to the freeze.


* **Classification:** NOTE (deserves prominent disclosure in narrative summaries, though properly documented in results limitations).



### 4. Novelty Check

* **Verdict:** Sound


* **Analysis:** Pre-declared novelty criteria in `structure.mjs` and `structure.json` are fully satisfied: the bank's 5th-percentile clustering (0.243) exceeds the development family's 95th percentile (0.167), and the cyclomatic number is 13 compared to 7 for development worlds.


* **Classification:** NOTE



### 5. Statistical Execution

* **Verdict:** Sound


* **Analysis:** Paired percentile bootstrapping (10,000 resamples, seeded by label) is correctly implemented. Although certain families exhibit skewness (e.g., HALF median is −1, and the top decile contributes 51.7% to G1's sum), the pre-registered `gainShape` test correctly flags and accounts for distribution shape (`CONSISTENT` vs. `TAIL-DRIVEN`) without overriding the primary nonparametric interval criteria.


* **Classification:** NOTE



### 6. Safety (G2)

* **Verdict:** Defensible


* **Analysis:** BELIEF takes more steps than MBVI3 in 133 of 165 RARE labels. Nevertheless, the upper bound of the cost difference (+9.8 [3.6, 14.9]) is well below the pre-registered safety threshold of 25 steps inherited from CF-06.


* **Classification:** NOTE



### 7. The G4 Construct

* **Verdict:** Sound with caveats


* **Analysis:** G4 measures a raw count of reopened edges met while blocked and subsequently crossed at any time. Because BELIEF meets a higher absolute number of blocks (3.32 vs. 2.31 per run in OFTEN), G4 captures both meeting frequency and return conditional on meeting. The claim C4 ("Its belief changes what it does after meeting a block") is supported, provided its definition as a count is respected.


* **Classification:** MINOR / NOTE



### 8. Attribution

* **Verdict:** Sound


* **Analysis:** Contrasts A1–A5 and the exactness check (`alarms.opensFalse = 0`, `alarms.opensReal = 0`) are computed exactly as specified in `SPEC.md` and `m13_lib.mjs`. The exactness check holds, validating the attribution split.


* **Classification:** NOTE



### 9. Post-Result Analyses

* **Verdict:** Sound


* **Analysis:** Post-result analyses (RESULTS §7–§9 and associated scripts) are explicitly distinguished from pre-registered tests. Descriptive findings (such as the crossing split in §8 showing 97% of OFTEN recovery differences occurring where BELIEF re-crossed in its own window) do not overreach their scope.


* **Classification:** NOTE



### 10. Independent Verification

* **Verdict:** Sound


* **Analysis:** The pre-result independent checker (`verify_m13.mjs`) and supplementary trace validator (`check_measures_from_traces.mjs`) successfully recompute and confirm data integrity across all rows and event logs.


* **Classification:** NOTE



### 11. Provenance and Integrity

* **Verdict:** Sound


* **Analysis:** All file hashes (`PINS.json` covering 44 closure files), determinism checks (Run A vs. Run B core rows identical), clean-tree rules, and process wake requests (`run_m13_awake.ps1`) executed successfully without anomalies.


* **Classification:** NOTE



### 12. Conclusions & State Consistency

* **Verdict:** Sound


* **Analysis:** RESULTS §12 and `PROJECT_STATE.md` updates accurately reflect the evidentiary record without overstating claims of universal generalization.


* **Classification:** NOTE



---

## Findings Classification Summary

* **MATERIAL Findings:** None. (No errors were found that alter any verdict line, summary statement, or primary claim under the frozen rules).
* **MINOR / NOTE Findings:**
* Family selection was guided by M12 mechanism knowledge (detour tail characteristics) rather than random sampling. This limitation is appropriately disclosed in RESULTS §11 but should be kept in view when interpreting structural generality.


* RARE cost shows an increase in 133 of 165 labels, reinforcing that safety is established relative to the pre-declared threshold (25 steps) rather than an absence of cost.





---

## Final Conclusion

B. DEFENSIBLE WITH SPECIFIC QUALIFICATIONS.

The implementation, statistical analysis, and reported conclusions of M13 are computationally and scientifically defensible under its pre-declared rules. Generalization is strictly established *on one held-out structural family (modular rings) in one development-level run*, with explicit qualification regarding family selection bias and RARE-phase operational costs.
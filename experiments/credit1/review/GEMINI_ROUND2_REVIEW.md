Independent Scientific Review: CREDIT-1 Revision 2 (`DESIGN_4.md` / `CREDIT1_GEMINI_DESIGN_REVIEW_PACKAGE_R2.md`)
Area Verdicts (A–G)

* Area A (Round-1 Resolution): PASS

   * Reasoning: All round-1 concerns—including Q-only primary framing, unverified substitute counts, mischaracterized edge-filtered writes, and oracle-knowledge assumptions in the downhill measure—have been rigorously addressed, corrected, or explicitly reframed and deferred with sound justifications.

* Area B (Interventions): PASS

   * Reasoning: Arm A (28 substitutions) and Arm A+ (32 substitutions) are precisely defined at the operand and source-line level using static census tooling (`census_credit_sites.mjs`). Claims are correctly bounded to the re-keying bundle as a whole.

* Area C (Controls): PASS

   * Reasoning: The 9-cell design successfully incorporates goal-swapped store controls ($N1A^\times$, $N1L^\times$) to evaluate goal specificity and a component control ($N1A\_noQ$) to isolate persisted Q-value contributions.

* Area D (Statistics): PASS

   * Reasoning: The primary family is streamlined to two claims ($P1, P2$) evaluated under Bonferroni-2 ($\alpha = 0.025$) using 97.5% paired percentile bootstraps. The 16-cell decision grid (R1–R8) is exhaustive, mutually exclusive, and free of post-hoc ambiguity.

* Area E (Instruments and Parity): PASS

   * Reasoning: Instrumentation is robustly specified through observational wiring checks (`I-CRED`) and comprehensive write-tracking ledgers (`I-LEDGER`) across all exported Maps, supported by deterministic fixtures and static/dynamic default-off parity checks (S-1–S-5, D-0–D-4).

* Area F (Integrity): PASS

   * Reasoning: Experimental integrity is protected by strict stream territory allocation ($\ge 2032$), collision checking against registry and committed study plans, a 10% maximum world exclusion rule, and fixed session budgets ($n=1,500$).

* Area G (Claim Limits): PASS

   * Reasoning: Claim boundaries are strictly enforced. The design explicitly prohibits overclaiming (no attribution to map-free spatial reasoning, planning, cognition, or production readiness) and leaves LEARN-0 untouched.

Mandatory Corrections

1. [BC-1] Extend Census Tooling to Arm A+: Extend `census_credit_sites.mjs` to classify Arm A+ lines (`4703`, `4710`, `4712`, `4960`) and verify substitution sets S-3.

2. [BC-2] Define Driver Requirements for Cross-World Store Delivery: Implement driver logic allowing N1A× and N1L× to load delivered stores from paired worlds $\pi(w)$ while enforcing the `NO_Q` mask for N1A_noQ.

3. [BC-3] Complete Write-Site Census: Run a complete write-site census of `main.js` and `render/*.js` to ensure zero unclassified write sites across session stores.

4. [BC-4] Implement Synthetic Test Fixtures: Build deterministic test fixtures covering every event class for L, A, and A+ to validate `I-CRED` and `I-LEDGER`.

5. [BC-5] Formalize `I-LEDGER` Map List and Gaps: Document the map list (F18), inner-map wrapping mechanisms for `transitions`, and explicitly log non-Map store gaps (e.g., emotion, semantic layers).

6. [BC-6] Execute Static Checks S-1 to S-5: Perform static reverse-substitution identity checks upon implementation authorization.

7. [BC-7] Finalize Calibration Protocol: Specify named development worlds, coverage lists, determinism baselines, and pass rules for calibration.

(Before-freeze blockers BF-1 through BF-8 and deferred items DL-1 through DL-8 are correctly categorized in the package and require no immediate structural changes.)

Optional Suggestions

* OPT-1: Consider adding a lightweight runtime assertion in the driver that catches any unexpected `__CREDIT1_TEL__` side effects during D-2 parity checks.

* OPT-2: Log self-target frequencies during calibration to empirically verify the assumption that self-keys ($o_t \to o_t$) remain unread by candidate scoring.

Answers to the 10 Review Questions

1. Are the corrections in section 1 right? Yes. Factual corrections regarding transition store reads (distinguishing episodes/trajectory confidence from direct candidate/scoring reads), substitution counts (28 for A, 32 for A+), and the demotion of $P3$ to mediator $M1$ are source-grounded and scientifically sound.

2. Is arm A, as a re-keying bundle with claims limited to the bundle, an adequate test of H1 and H2? Yes. Re-keying the system's misaligned credit channels as a bundle correctly tests whether correcting credit assignment restores store utility ($H1$) and outperforms legacy credit ($H2$).

3. Is A+ correctly characterised as an activation-type module? Is it right that it is not needed for H1 and H2? Yes. A+ converts edge-filtered learners from sparse triangle execution ($\approx 7\%$) to per-step reinforcement, making it an activation intervention rather than a pure re-keying correction. It is correctly separated from primary hypotheses $H1$ and $H2$.

4. Do S2 + S3 + S4 separate the three questions (goal-specificity; values' contribution; whether alignment improves goal-directed use)? Yes. Within stated methodological limits, S2 tests goal specificity via goal-swapped stores, S3 compares aligned vs. legacy swap effects, and S4 isolates persisted Q-values via the `NO_Q` mask.

5. Is the P1 × P2 grid exhaustive and correctly worded, especially R2, R5 and R7? Yes. The 16-cell grid mapped to R1–R8 covers all logical intersections without post-hoc circularity. R2 and R5 correctly scope harm-removal and null outcomes.

6. Is the mediator M1 now correctly bounded? Are the map-free episode-outcome mediators adequate? Yes. $M1$ ($D - C$) is correctly bounded as an exploratory, harness-computed descriptive metric that the agent never perceives, removing oracle-knowledge artifacts.

7. Can I-LEDGER, with the fixtures, detect missed writes, mis-keyed updates, reset errors, carried decisions and unintended changes to held sites? Yes, by observational wrapping of exported Map `set` methods cross-referenced against census expectations (EXEC, LEGACY, PATH, DECAY), with the acknowledged limitation that non-Map session stores are excluded.

8. Are the static and dynamic default-off requirements (S-1 to S-5, D-0 to D-4) sufficient for a freeze? Yes. The combination of static reverse-substitution identity and dynamic off-parity with exhaustive event coverage provides rigorous verification.

9. Are the sample-size method, equivalence power statement, exclusion rules, and territory adequate? Yes. Bonferroni-2 sizing with calibration SD estimation for P2, equivalence power reporting, core primary isolation from swap failures, and strict stream allocation ($\ge 2032$) are fully adequate.

10. Is the split between BC, BF, and DL items correct? Yes. The operational sorting into implementation/calibration prerequisites (BC), confirmatory verification prerequisites (BF), and deferred extensions (DL) is logically sound.

Quoted Factual Errors

* There are no uncorrected factual errors remaining in revision 2. All previous misunderstandings regarding transition reads and substitution counts have been successfully identified and corrected by the design author.

Overall Verdict
READY FOR IMPLEMENTATION MILESTONE (Clear the BC items, then proceed to development calibration).

# Audit of `H1R_FREEZE_PACKAGE_PROPOSAL.md` as a final preregistration candidate

**Status:** untracked; not committed. 2026-10-04. Claude (implementer), auditing its own proposal adversarially.

**How it was made:** read-only. No code was changed, H1-R was not run, and no pilot or held-out configuration was generated. The checks used:
- seed arithmetic;
- the typed registry;
- reading B2 source;
- statistical simulation (no agent).

**Scratch scripts** (session scratchpad): `audit_checks.mjs`, `audit_pilot_alt.mjs`, `audit_minF.mjs`, `audit_minF2.mjs`.

**Verdict, in short:** the proposal is **not freezable as written**. It has seven defects (§A). With the corrections in the chat reply's final decisions it is freezable.

---

## A. Defects found in the proposal

| # | Proposal says | Finding | Class |
|---|---|---|---|
| A1 | D-3: min F′ with Satterthwaite df is "conservative" | **False for few seeds.** In simulation (20,000 replications, C = 30), Type I error at α = 0.01 is 0.078 at S = 2, 0.034 at S = 3 and 0.016 at S = 5 when seed variance dominates. It is near nominal only from S ≥ 8. Cause: when MS_S is small by chance, the Satterthwaite df becomes large (dominated by MS_C's 29 df) at the same moment the denominator becomes small. **With df = min(C − 1, S − 1)** (Hsu-type conservative df), Type I error is ≤ 0.0103 in every scenario tested, including t₃ heavy tails and pilot-sized arrays. | Statistical error; must be fixed |
| A2 | D-2: pilot stream from 893000, bound 894999, "P(10 accepted) = 0.99999997" | That probability holds only at the point-estimate acceptance rates. At the 95% lower bounds it is **0.9946**, about a 0.5% chance that the extension cannot be completed. The proposal's response (refuse, then the Director decides) would be a data-dependent decision taken after Stage 1. **Block 886000–889999** (free) has 0 exact contacts with pilot positions and P(10 accepted) ≥ 0.99999996 even at the lower-bound rates. | Sampling-design weakness |
| A3 | §11: P(any confirmatory cell flagged) "≤ 1.95 × 10⁻⁶" | Correct at point-estimate rates, but highly sensitive to them. It is **8.4 × 10⁻⁴** at the 95% lower-bound rates and **9.5 × 10⁻⁴** at half the rates. For an actual shared state: 3.2 × 10⁻¹⁴, 6.3 × 10⁻⁷ and 9.1 × 10⁻⁷ respectively. The statement must separate exact from model-based figures and give the range. | Overstated inference |
| A4 | §2.1: "the non-goal reward landscape is a property of the seed" | **Only at boot.** `_learnSemantic` (`render/episodeManager.js:1044`) calls `trainEmbedding` (`render/embeddings.js:153`) on the transitions of learned episodes, moving the embeddings during the run (B2 source). The landscape therefore starts seed-determined and then drifts with each run's own experience. | Factual error |
| A5 | §2.4: "0 crashes and 0 invalid runs in all verification runs" | Crashes: 0 (X0 in R2's 460 runs and R3's 469 runs). Validity flags exist only for driver runs: 6/6 valid in each suite. "0 invalid runs" overstates this. | Wording |
| A6 | F-5 and F-6 thresholds | Frozen §15 gives no window for F-5 and F-6, and the proposal did not pin one. **This is a post-outcome degree of freedom.** | Ambiguity (frozen) |
| A7 | When H1 and H1-strict "hold" | Frozen §2.1/§2.3 define them in words; neither the frozen text nor the proposal maps them to tests and F-criteria. **This is a post-outcome degree of freedom.** | Ambiguity (frozen) |

---

## B. Item-by-item audit

### 1–2. Tracing each decision to implementation and evidence

| Decision | FACT (source) | INFERENCE | RECOMMENDATION (final) |
|---|---|---|---|
| D-2 | Registry: config 0–889,999 and 893,000–894,999 free; 890,000–892,999 and 895,000–900,499 consumed; 900,500 onward held out. Seeds 000–003 refused for H1-R; 004–010 and 100–119 available. R3 domain: seeds 000–009 and 100–119. Brute force: 886,000–889,999 vs seeds 004–008 × pilot × index 0–9 → **0 contacts** (reserve and actual). | Geometric acceptance model gives capacity ≥ 0.99999996 | Block 886,000–889,999; seeds 004–008; extension reuses the seeds |
| D-3 | The design is fully crossed (frozen §5.2, §12.3). Shared within a configuration: p_e, goal. Shared within a seed: cognitive stream, boot embeddings, σ. Per cell: environment (R3a–c). | The simulation shows that cell-level and configuration-mean tests are invalid when the seed variance is above 0 (Type I error up to 0.63) | min F′ with ν = min(C − 1, S − 1) |
| D-4 | Scoring: w = 0.6·clamp(F) + 0.4·arbitrate(…). F and `confidenceScore` each contain 12(T − 0.5). One cognitive draw per candidate (`drift`). `arbitrate` and `getPathTrust` are pure (no state write, no draw). `calculateDecisionScore` draws **and** writes `lastArbitrationBreakdown`, so the shadow must not call it. | The shadow is implementable from captured quantities plus the pure `arbitrate`; capturing the pre-clamp score needs one observational probe in `render/scoring.js` | Definitions as finalised in the chat reply |
| D-5 | `run_h1r.mjs` saves the reward events, `calls` (3,005), the fingerprint, envCounters and validity | — | The measurement layer, part 2, is required before Stage 1 |
| D-6 | 287/287 runs: calls = 3,005; `pressSpace` makes 5 calls; `setTick(5l)` runs before loop l | — | τ = i − 5 |
| D-7 | 11 validity flags (run_h1r.mjs) | — | Any false flag = crash |
| D-8 | `evidence_r3` ON statuses: M7 49/0, G8 21/1 (G8.4c), G9 11/0, G10 38/0, e5 30/0, G15 24/0, G16 28/0; conformance 71/3 | — | Blocking set as proposal §7 |
| D-9 | A5 ≡ A2 on 7/41 (P1, `evidence_r3`) | — | Retain A5 |
| D-10 | Under R1 no slip reaches PE; the factorial needs an un-pinned variant | — | Waive |
| D-11 | 3 M7 documents untracked (SHA-256 in proposal §10); only the R3 erratum mentions H1-R under `research/` | — | Commit with `-text` and log the rulings |

### 3. D-3 from first principles
- **Estimand.** μ_{k,W} = E_{c∼𝒞} E_{s∼𝒮} [ Y^{A1}_{cs}(W) − Y^{Ak}_{cs}(W) ]. Here 𝒞 is the distribution of accepted configurations (frozen generator plus the ERR-07 predicate), and 𝒮 is the distribution of agent seeds; Y is the primary metric.
- **Null hypothesis.** H0_{k,W}: μ_{k,W} = 0, two-sided. The alternative direction for confirmation is μ > 0.
- **Variance components.** d_cs = μ + α_c + β_s + ε_cs, so Var(d̄) = σ_c²/C + σ_s²/S + σ_e²/(CS). σ_e² absorbs the configuration × seed interaction and run-level chaos. R3 makes the cells' environment streams disjoint, so no environment term is shared across cells.
- **Why min F′.** The test needs a denominator whose expectation is at least Var(d̄) and which never goes negative. Expected mean squares are E[MS_C] = Sσ_c² + σ_e² and E[MS_S] = Cσ_s² + σ_e², so (MS_C + MS_S)/(CS) has expectation Var(d̄) + σ_e²/(CS). It is a positive combination of two independent mean squares, which is the Behrens–Fisher structure. Hsu's conservative df, min(df₁, df₂), controls the size of that structure. Clark (1973) introduced min F′ for exactly this crossed subjects × items design.
- **Assumptions.**
  - (i) Configurations and seeds are exchangeable draws from their populations: configurations from the outcome-blind sequential walk; seeds as a fixed, pre-declared list, outcome-blind, on disjoint PRNG segments.
  - (ii) The additive decomposition (definitional; interaction goes into ε).
  - (iii) Approximate normality of the configuration means and seed means. Simulated robustness holds under t₃ tails.
  - (iv) Independence of α, β and ε.
  - (v) A complete, balanced array, enforced by the missing-cell rule.
- **Alternatives.**

  | Alternative | Assessment (simulation) |
  |---|---|
  | quasi-F′ (MS_C + MS_S − MS_CS) | Same small-S inflation (0.086 at S = 2; 0.017 at S = 5) |
  | REML random-intercepts mixed model | Equivalent to truncated quasi-F′ for balanced data, so it shares the issue unless Kenward–Roger df are used. Needs an iterative fitter, which adds degrees of freedom (optimiser, boundary handling). |
  | Configuration-means Wilcoxon or t | Invalid when the seed variance is above 0 (up to 0.63) |
  | Pigeonhole bootstrap test | Approximate; McCullagh (2000) shows no bootstrap is exactly unbiased for crossed arrays |

  **No alternative is more defensible for confirmatory Type I control at the small S the power grid permits.** min F′ with conservative df is the recommendation. Its cost is power: 0.34 versus 0.46 for the Satterthwaite form at S = 10. The power procedure simulates exactly this test, so the cost is priced into S*.

### 4. α and Holm
- **FACT.** The family is {A1vA2, A1vA5, A1vA6} × {W1, W3} = 6 (frozen §11.1, Director ruling 2026-08-19). α = 0.01, Holm across all six, confirmation iff adjusted p < 0.01 and the predicted direction (frozen §11.2).
- The proposal keeps exactly this structure; only the per-test p-value source changes.
- Holm is valid under any dependence (W1 and W3 share runs). The power procedure's 0.01/6 is the strictest Holm step (frozen §12.3). **Verified consistent.**
- The 99% CIs used by the F-criteria are unadjusted, as frozen. If a test is Holm-confirmed in W, its unadjusted 99% CI in W excludes 0 (test inversion with the same t′ and ν), so no confirmed test can coexist with its own F-criterion firing in that window.

### 5. D-2 and selection bias
- **FACT.**
  - The acceptance predicate (R1–R5, G11, on `pPhase1`) reads only configuration properties, never an agent outcome.
  - The stream start is fixed before any generation.
  - The goal is a fixed function of the index.
  - Generator segments of any two seeds within 70,000 of each other share no state: the minimum lag is 14,173 draws, and an overlap would need fewer than 756.
- **INFERENCE.** The first accepted candidate of an i.i.d. sequence is distributed as the acceptance-conditional distribution (rejection sampling). Pilot and held-out configurations are therefore draws from the same population per goal index, and there is no selection bias relative to the estimand.
- Choosing the block from free territory using PRNG arithmetic (contacts and capacity) is outcome-blind.
- The F-11 extension is the frozen bounded two-look procedure on pilot data only. Its conditioning affects Stage-1 variance estimates, not confirmatory inference.
- Residual: goal imbalance. Pooled pilot goals are 8 ×3, 12 ×3, 16 ×2, 19 ×2; held-out goals are 8 ×8, 12 ×8, 16 ×7, 19 ×7. This is fixed by the index rule, not selected.

### 6. Compatibility with the R3 verified domain
- **FACT:** seeds 004–008 lie at offsets 4–8 ∈ [0, 9]; block code 0; indices 0–9 < 32. R3c proves all 1,920 domain slots disjoint and free of contacts with the agent streams. Verification runs used only seed 000, so pilot positions were never consumed.
- Configuration generators: 886,000–889,999 vs pilot positions → 0 contacts (exact brute force; the only contact in 880,000–889,999 is 885,633, at seed 005, indices 6 and 7).
- Confirmatory: seeds 100–119 × held-out × index 0–29 lie inside the domain.

### 7. D-4 metrics: no future information, no behaviour change

| Metric | Information used at its time point | Behaviour risk and control |
|---|---|---|
| Primary metric, goal rate, half-life | Window sums. The half-life threshold uses W2 (before the shift) and trailing windows. | Reads saved events; M3/M4 show the probes are neutral |
| Link ③ shadow | Only the state at τ: captured weights, drift value, pre-clamp score, pure `arbitrate` | Must not call `calculateDecisionScore` (draws and writes state). Neutrality gate (fingerprint identical with and without). |
| Link ④ | The sample frame is flip status (decision-time) for t ≤ 2980, sampled with a fixed seed; outcomes play no part | The fork is a separate process; the hook is inert unless armed (gate: a no-switch fork reproduces the original run) |
| Calibration | Attempts within the phase up to the snapshot; store read via pure maps | Snapshot at a loop boundary; read-only |
| Brier | The key's trust before the attempt; prequential base rate | Read-only |
| Steps-to-goal, entropy, slip rate | Event records only | Read-only |
| F-10, F-1 run inclusion | F-1 excludes runs with \|K\| < 3. This is data-dependent but pre-specified and reported. | — |

### 8. D-5: what needs the new measurement layer
**Already measurable:** R_W in all windows; F-4, F-5, F-6, F-8, F-9, F-11; the headline fraction; goal rate; half-life and F-7; F-10; A5 ≡ A2 identity; whole-run n_updates (equal to `envCounters.attempts` for A1, by the B3 reconstruction).

**Needs the new layer:**
- link ① per window, the ≥ 3-observation fraction and trust entropy;
- link ② (F-1, Brier, curve, partial correlation);
- link ③ (F-2, monotonicity);
- link ④ (F-3; fork driver);
- steps-to-goal (cap resets are not saved);
- slip rate per window excluding goal entries;
- trajectory entropy;
- the A5 floor counter.

### 9. Configuration-generator probabilities: exact versus model

| | Method | Pilot (886,000–889,999 × seeds 004–008 × index 0–9) | Confirmatory (900,500–960,499 × seeds 100–119 × index 0–29) |
|---|---|---|---|
| **EXACT** | Set enumeration (BigInt) **and** independent brute force (32-bit) agree | 0 contacts (reserve and actual) | 44 contacts (reserve rule) / 31 (actual consumption) |
| **MODEL** (geometric, ERR-09 rates; two independent methods, convolution and forward DP, agree) | Point rates | — (0 exactly) | P(any cell flagged) 1.95 × 10⁻⁶; actual shared state 3.2 × 10⁻¹⁴ |
| | 95% lower-bound rates | — | 8.4 × 10⁻⁴; 6.3 × 10⁻⁷ |
| | Half rates | — | 9.5 × 10⁻⁴; 9.1 × 10⁻⁷ |
| Superseded figure | A uniform random state on 2³² | "1.19 × 10⁻⁶ per run" (R3 report) | wrong model; remove |

### 10. Deviations from the historical preregistration (frozen M7)

| Deviation | Class |
|---|---|
| Conformance edits N1, N2, A3, A4, GOAL, P4, CRG | **Validity repair** (the runtime made to match frozen text) |
| R1 learning order (H1R-S1 supersedes two ERR-05 §3.1 sentences) | **Validity repair**. Interpretive consequence: A2 is not an ordinary Q-learner (H-B reading) |
| R2 goal-entry draw and credit (D-1) | **Validity repair** (§3.3) |
| R2 measurement probes; part 2 of the layer | Instrumentation (no scientific change) |
| R3 configuration-scoped environment seed (§5.1) | **Validity repair** of the randomisation structure |
| H1R-S2/S3 (§10.1/§10.2 premises do not hold) | Interpretation correction |
| H1R-S4 (G8.4c), H1R-S5 (G15 → G15′) | **Validity repair** of gate specifications |
| D-2 pilot block, pilot seeds, and an extension that reuses seeds | **Sampling change** (forced by degeneracy, the registry and the R3 domain) |
| D-3 test, CIs, power procedure | **Analysis change** |
| D-4, D-6, and the F-5/F-6 window and verdict table | **Analysis specification** (filling gaps in frozen text) |
| D-7 validity failures handled as crashes | Inclusion-rule extension (analysis) |
| D-10 factorial waived | Scope reduction of an exploratory component |
| D-9, D-11 | None (reporting, governance) |
| **Scientific hypothesis changes** | **None**: H1, H0, H1-strict, competing hypotheses, arms, windows, primary metric, α, family, thresholds and the claim ceiling are unchanged. Claim qualifiers are added (R1 learning order; FROZEN = Q- and trust-frozen). |

### 11. Remaining ambiguities (each closed in the final decisions)
1. F-5/F-6 windows (A6).
2. The H1/H1-strict verdict mapping (A7).
3. The df rule (A1).
4. The bootstrap quantile definition and generator seeding per analysis.
5. Degenerate min-F′ denominators.
6. Link ④: whether ε-exploration decisions count, and fork crash handling.
7. Calibration key set (goal-entering keys) and F-1 run exclusion.
8. Aggregating undefined steps-to-goal medians.
9. Freezing the analysis code (SHA before Stage-1 data).
10. The rule against interim analysis.
11. Instrument identity across stages.
12. What happens when the pilot bound is reached.
13. Determinism re-run selection under crossing.

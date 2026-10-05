# H1-R D-021(b) — independent implementation package for Gemini

**Authority.** Research Director ruling of 2026-10-05: "proceed with D-021(b) only". D-021 is the H1R-P1 independent-falsification process, recorded in Appendix C.

**Your task.**
1. Implement, independently, the analysis that H1-R v1.0 pre-registers in §12, §13 and §14, together with every calculation they rely on. That means the §8 metric definitions, the §10 validity handling, and the inherited M7 clauses.
2. Do it from the frozen texts in this package alone.
3. Your code will later run, next to a separate implementation, on the pre-registered synthetic fixture set described in §9. Agreement is required on every decision exactly, and on every real-valued output within 10⁻⁹. Any disagreement halts the study until the cause is found.

**Package identity.** You receive exactly two things: this file, and the synthetic fixture files of §9. The person relaying the package tells you this file's SHA-256; record it in your deliverables (§11). The fixture files' SHA-256 values are listed in Appendix F.3.

---

## 1. Rules of independence (binding; from the Director's ruling)

1. **Authority.** Use the frozen H1-R v1.0 text (Appendix A) as the authoritative scientific specification.
2. **Scope.** Implement independently:
   - the crossed test;
   - the pilot and extension logic;
   - the confidence intervals;
   - the Holm correction;
   - the F-1 … F-11 rules;
   - the H1 / H1-STRICT verdict logic;
   - missing-cell handling;
   - the undefined-statistic rules;
   - every other pre-registered calculation.
3. **No other implementation.** Do not ask for, look at, or infer from any other implementation of this analysis, including the future `analyze.js` or any interpretation by the other implementer. None is included here, and none should be requested.
4. **No protocol change.** Do not modify the scientific protocol. Where the text is silent or ambiguous, do not invent a rule silently. Record the question, your reading, the exact text it rests on, and mark it **UNSPECIFIED** (§8.2). The Director adjudicates.
5. **No outcome data.** Do not use H1-R outcome data to shape the analysis. None exists: Stage 1 and Stage 2 have not run, and every number in the fixtures is synthetic.
6. **Blind to the verdict.** Your implementation must not know or anticipate the final H1-R verdict.
7. **Provenance.** Record exact source hashes and your environment (§11).
8. **Nothing is run.** No Stage 1, no Stage 2, no new experimental configuration, no registry change. Your implementation reads fixture files and writes one output file; it runs no agent.
9. **Only this handoff.** Use only this file (`GEMINI_PACKAGE.md`) and the supplied synthetic fixture files. Do not request or retrieve any repository file that is not included in this handoff package.
10. **No external access.** For the whole task, use:
    - no web browsing;
    - no GitHub browsing;
    - no repository access;
    - no other external source of any kind.

    Record in `PROVENANCE.md` that no external material was accessed (§11).

## 2. Order of authority

1. **Appendix A — H1-R v1.0**, the whole file, verbatim. SHA-256 `c52e73378ad7759fe4e2829e972d1a97b5297da49b327b3c700c654a218ca836`.
2. **Appendix B — M7 v1.0 clauses that H1-R inherits.** v1.0 says "this document inherits every M7 clause that it does not explicitly supersede". The appendix gives M7 §7, §8, §9, §11, §12, §15 and §16 verbatim (M7 SHA-256 `2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9`). Where v1.0 supersedes an M7 clause, v1.0 governs; v1.0 Appendix A lists the supersessions.
3. **Appendix C — decision-log entries D-020 (implementation pins) and D-021 (this process)**, verbatim. D-020 fixes implementation details that v1.0 leaves to the implementer, and binds both implementations.
4. **Appendices D, E and F are facts, not protocol:**
   - **D:** the frozen agent code that the shadow weight of §8 depends on (B2 `707cb1e`), the random-number generator, and the graph;
   - **E:** the run-record format produced by the accepted measurement instrument (MS-1, commit `30e7693`);
   - **F:** the fixture input schemas, with short excerpts.

## 3. Sections interpreted

| Topic | Primary text | Also read |
|---|---|---|
| Ticks, τ, phases, windows | v1.0 §6 | M7 §7 |
| Pilot, extension and confirmatory material; seeds; the hard bound | v1.0 §7, §13 | M7 §12.1, §15.0 |
| Every metric | v1.0 §8 | M7 §8 |
| Validity, crashes, cell dropping | v1.0 §10 | M7 §9.4 |
| Stale-tick exclusion; dual reporting | v1.0 §10 | M7 §9.1–§9.3 |
| Confirmatory test, df, Holm, 99% CI, incomplete arrays, degenerate case | v1.0 §12 | M7 §11.1, §11.2 (superseded test) |
| Two-way bootstrap, effect sizes, sensitivity analyses | v1.0 §12 "Further frozen analysis elements" | M7 §11.3, §11.4, §11.5 |
| F-11 first, the single extension, pilot-data use, power procedure, S* | v1.0 §13 | M7 §12.3 (steps 1–3 superseded), §12.4, §15.0 |
| Falsification criteria, verdict function | v1.0 §14 | M7 §15, §16, §16.1 |
| A5 descriptive reports | v1.0 §15 | M7 §4.2 (not reproduced; not needed) |
| Analysis seeds | v1.0 §18 | M7 §19 |
| Implementation pins | D-020 pins 1–6 | — |

## 4. Formula index (verbatim; the builder checks every quoted line against its source)

The lines below are copied from the frozen texts and add nothing. Where a line here and the full appendix text disagree, the appendix governs.

**Ticks and windows**
> [v1.0 §6] **τ = i − 5**, where i is the 0-based `runAgent()` call index (the `measure.mjs` event index). Calls 0–4 belong to no window.
> [v1.0 §6] Phase II iff τ ≥ 1500. This is exact, because `env.setTick(5l)` precedes loop l.
> [v1.0 §6] "At τ = 1499" means after call 1504, at the loop boundary before `setTick(1500)`. "At τ = 2999" means after call 3004.

**Primary metric and run-level measures**
> [v1.0 §8] **Primary metric** (M7 §8.5). For each run and window, `R_W = ( Σ r over events [i, r] with τ = i − 5 ∈ W ) / ( |W| / 100 )`.
> [v1.0 §8] **Goal-reach rate** = (number of events with r = 12 and τ ∈ W) / (|W|/100).
> [v1.0 §8] - TR(τ) = Σ r over τ′ ∈ [τ − 99, τ];
> [v1.0 §8] - thr = 0.5 · R_W2;
> [v1.0 §8] - t_below = the first τ ∈ [1500, 2999] with TR(τ) < thr. If there is none, HL = 0;
> [v1.0 §8] - otherwise t_rec = the first τ ∈ (t_below, 2999] with TR(τ) ≥ thr, and HL = t_rec − 1500. If there is no t_rec, HL = 1500 (right-censored; the censoring count is reported per arm).
> [v1.0 §8] **F-10 measure.** For arm A1, `R_all = Σ r over τ ∈ [0, 2999] / 30` per run.

**Confirmatory test (§12)**
> [v1.0 §12] For comparison k ∈ {A2, A5, A6} and window W ∈ {W1, W3}, let d_cs = Y^{A1}_cs(W) − Y^{k}_cs(W) over the complete C × S array of held-out configurations and confirmatory seeds.
> [v1.0 §12] - **Statistic:** t′ = d̄ / √((MS_C + MS_S)/(C·S)), with MS_C = S·Σ_c(d̄_c· − d̄)²/(C−1) and MS_S = C·Σ_s(d̄_·s − d̄)²/(S−1). It is referred to Student's t with ν = min(C−1, S−1) degrees of freedom, giving a two-sided p. MS_CS is not used in the test.
> [v1.0 §12] - **Degenerate case:** if MS_C + MS_S = 0, then p = 1 when d̄ = 0, and p = 0 otherwise.
> [v1.0 §12] - **Holm:** the six p-values {A1vA2, A1vA5, A1vA6} × {W1, W3} are Holm-adjusted, p̃₍ⱼ₎ = max_{i≤j} min(1, (7−i)·p₍ᵢ₎). A member is **confirmed iff p̃ < 0.01 and d̄ > 0**.
> [v1.0 §12] - **99% CI:** the 99% CI of a paired difference is d̄ ± t_{ν,0.995}·√((MS_C + MS_S)/(C·S)). A CI "contains 0" iff lower ≤ 0 ≤ upper. This CI is used for "≈" (frozen §15.0), F-4 to F-9 and F-11 (on the pilot array).
> [v1.0 §12] - **Incomplete arrays:** any configuration row containing a dropped cell is removed before testing. If fewer than 2 rows or 2 seeds remain, the test is not computable and the comparison is not confirmed.

**Two-way bootstrap and effect sizes (§12)**
> [v1.0 §12]   - B = 10,000. Each analysis starts a fresh `makeRng(770002)` (mulberry32, `instrumentation/rng.js`).
> [v1.0 §12]   - Each iteration draws C configuration indices, then S seed indices, uniformly with replacement (⌊u·n⌋), and recomputes the statistic on the available cells.
> [v1.0 §12]   - The 99% interval is the 50th and 9,950th order statistics (1-based).
> [v1.0 §12]   - Used for: the headline fraction (A1 − A2)/(A7 − A2) per primary window; the F-1 mean ρ; F-3; the link ③ monotonicity diagnostic; and descriptive link CIs.
> [v1.0 §12] - **Effect sizes:** d̄; the variance components σ̂_c² = max(0, (MS_C − MS_CS)/S), σ̂_s² = max(0, (MS_S − MS_CS)/C), σ̂_e² = MS_CS; and the matched-pairs rank-biserial correlation on configuration means. All descriptive.

**Power procedure (§13) and its pins (D-020 pin 4)**
> [v1.0 §13] 1. From the final pilot array of A1 − A2 cell differences, for each W ∈ {W1, W3}: μ̂ = d̄ and σ̂_c², σ̂_s², σ̂_e² (§12), used as they are.
> [v1.0 §13]    - draw a_c ~ N(0, σ̂_c²) for 30 configurations, b_s ~ N(0, σ̂_s²), and e_cs ~ N(0, σ̂_e²), with normal deviates from `makeRng(770001)` through Box–Muller in the fixed order a, b, e (row-major);
> [v1.0 §13]    - form d_cs = μ̂ + a_c + b_s + e_cs;
> [v1.0 §13]    - apply the §12 test and reject iff p < 0.01/6.
> [v1.0 §13] 3. S* = the smallest S with power ≥ 0.80 in both W1 and W3; otherwise S* = 20, and the cap rule (frozen §12.4) applies unchanged.
> [D-020]    - **pairing:** one deviate per pair, z = √(−2 ln u₁)·cos(2πu₂), consuming u₁ then u₂; the sine partner is discarded;
> [D-020]    - **u₁ = 0:** u₁ is redrawn until it is non-zero, then u₂ is drawn;
> [D-020]    - **reset:** `makeRng(770001)` is re-initialised at the start of each (window, S). Iterations then draw a₁…a₃₀, b₁…b_S, and e row-major (c outer, s inner);
> [D-020]    - **loop order:** W1 then W3, S ascending.

**Link ③ and link ④ (§8; D-020 pin 1)**
> [v1.0 §8] - A **decision tick** is a τ on which `runPrediction` step 0 writes a non-null selection.
> [v1.0 §8] - argmax₁ = the first key of the existing stable descending sort of the A1 weights.
> [v1.0 §8] - The **shadow weight** of a candidate replaces the delivered T by 0.5 in both the pre-clamp score F and `arbitrate`'s `confidenceScore`; each changes by −12(T − 0.5).
> [v1.0 §8] - **F-2 statistic:** FR = Σ flips / Σ(3000 − replay ticks), pooled over all Stage-2 A1 runs.
> [v1.0 §8] - **Sample:** m = 10 per run, or all if fewer. `makeRng(770004)` drives a Fisher–Yates permutation of each run's population sorted by t; runs are taken in (configuration index, then seed) ascending order, and the first m are kept.
> [v1.0 §8] - **CA** = the mean over the sampled decisions of [Σ r over τ ∈ [t, t+20) in A1] − [the same in the fork].
> [D-020] 1. **argmax₁** = `bestChoice`: the first element of `choices.sort((a, b) => b.weight - a.weight)` (`const sorted = …` at main.js:2362; `const bestChoice = sorted[0];` at main.js:2367), at step 0, over the candidate-loop entries only. Graph-neighbour candidates appended afterwards are not part of it. **argmax₀** = the earliest-inserted candidate with the maximal shadow weight (the same stable sort applied to the shadow weights, in the same insertion order).
> [D-020] 5. **Fisher–Yates**, the B2 convention (`env.js` `shuffledIndices`, `arms.js` `makeSigma`): for i = n−1 down to 1, j = ⌊u·(i+1)⌋, swap a[i] and a[j].

**Link ② (§8; D-020 pin 6)**
> [v1.0 §8] - **Keys:** directed keys `u->v`, goal-entering keys included, with ≥ 5 raw attempts within the phase ([0, 1499] for τ = 1499; [1500, 2999] for τ = 2999).
> [v1.0 §8] - trust = (s+1)/(a+2) from the store at τ; p = that phase's configured `p_e`.
> [v1.0 §8] - **ρ_run** = Spearman with average ranks. It is undefined if fewer than 3 keys qualify, and the count of undefined runs is reported.
> [v1.0 §8] - **F-1 statistic:** the mean of ρ_run over A1 runs at τ = 1499.
> [D-020]    - K_τ is ordered by (from, to), ascending numerically;
> [D-020]    - the p-value is two-sided, (1 + #{|ρ*| ≥ |ρ|}) / 10,001.

## 5. Metric definitions (where they are)

Every metric is defined in v1.0 §8 (Appendix A). It pins and specifies the M7 §8 metrics (Appendix B), which it inherits.

| Group | Metric | Verdict-relevant? |
|---|---|---|
| Link ⑤ | R_W for W1–W4 | yes (§12 and F-4 … F-11) |
| Link ⑤ | goal-reach rate | no |
| Link ⑤ | half-life with censoring | yes (F-7) |
| Link ⑤ | R_all (F-10) | yes |
| Link ③ | decision ticks, argmax₁/argmax₀, flips | yes |
| Link ③ | FR, filtered and unfiltered | FR is F-2 |
| Link ③ | per-window rates, monotonicity diagnostic | no |
| Link ④ | population, sample, fork difference, CA | yes (F-3) |
| Link ② | key set, ρ_run, F-1 statistic | yes |
| Link ② | permutation null, Brier score, calibration curve, rank partial correlation, undirected pooled variant | no |
| Link ① | n_updates, fraction of keys with ≥ 3 raw attempts, entropy | no |
| Other | steps-to-goal (Kaplan–Meier), trajectory entropy, slip rate | no |

A5 reports (v1.0 §15) are descriptive.

## 6. Implementation requirements

1. **Form.** One file, `h1r_independent_analysis.mjs`, an ECMAScript module for Node.js ≥ 20, with no dependencies beyond Node built-ins. It is required to be JavaScript because exact agreement of the pre-registered random streams depends on IEEE-754 double arithmetic and on the same `Math.imul`, `Math.cos`, `Math.log` and `Math.sqrt` behaviour as the other implementation.
2. **Command line.**
   ```
   node h1r_independent_analysis.mjs <fixtureDir> <output.json>
   ```
   It reads every `S*.json` and `M*.json` in `<fixtureDir>` and writes one JSON document in the output schema of §10.
3. **Determinism.** Same inputs must give byte-identical output. Use no `Math.random`, no clock, no environment-dependent value, and no parallelism that changes order.
4. **Random numbers.** Use only `makeRng` exactly as in Appendix D (mulberry32), with the analysis seeds of v1.0 §18:
   - 770001 power;
   - 770002 bootstrap;
   - 770003 permutation;
   - 770004 link-④ sample.

   The draw order is part of the specification (v1.0 §12 and §13; D-020 pins 4–6). Document any order the text leaves open in the interpretation register.
5. **Numerical accuracy.**
   - Student's t distribution (two-sided p and the 0.995 quantile, integer ν ≥ 1) must be accurate to a relative error ≤ 1e-12 over the range used.
   - State your method, for example a regularised incomplete beta function by continued fraction, with an inverse found by bisection or Newton iteration to full double precision.
   - Do not use normal approximations for t.
6. **Sorting.** Where the text specifies a stable sort, use `Array.prototype.sort`, which is stable in Node ≥ 12, with the comparator the text gives.
7. **Encoding.** Undefined statistics are `null`. Non-finite numbers are the strings `"Infinity"`, `"-Infinity"` and `"NaN"`. Never emit a JavaScript non-finite number into JSON.
8. **No silent defaults.** Every branch the text does not settle must appear in the interpretation register (§8.2) and in `IMPLEMENTATION_NOTES.md`.

## 7. Verdict logic (verbatim, v1.0 §14; the full section is in Appendix A)

> [v1.0 §14] A criterion based on a 99% CI of a difference fires when the CI contains 0. F-3 and F-7 also fire when the CI lies below 0. F-1 and F-3 fire when their statistic is undefined.
> [v1.0 §14] - **H1 is SUPPORTED iff** at least one A1vA2 member is confirmed, **and** none of F-1, F-2, F-3, F-7, F-8, F-9 or F-10 fires.
> [v1.0 §14] - **H1-STRICT iff** H1 is SUPPORTED, **and** there is a window W ∈ {W1, W3} in which A1vA2, A1vA5 and A1vA6 are all confirmed, **and** neither F-5 nor F-6 fires.
> [v1.0 §14] - Otherwise the verdict is **NOT SUPPORTED**. Every criterion that fired is reported, and frozen §16 and §18 apply as written, including escalation when three or more of F-1 to F-10 fire.
> [v1.0 §14] - No other rule, window, metric or exclusion may enter the verdict.
> [v1.0 §14] - If F-11 fires, the study is void and no verdict is issued.

The per-criterion table (F-11, F-1 … F-10) is in Appendix A §14. Implement it from there.

## 8. Edge cases

### 8.1 Settled by the text

Implement exactly as written:
- the degenerate test (§12);
- incomplete arrays and the "not computable" case (§12);
- "contains 0" (§12);
- an undefined ρ_run (§8) and an undefined F-1 or F-3 statistic (§14);
- half-life 0 and right-censoring at 1500 (§8);
- P̄ ≤ 0, "memorisation not assessable" (§14 F-10);
- a crashed fork re-run once, then the sample dropped and reported (§8);
- a crash, i.e. any validity flag false, dropping the whole (configuration, seed) pair from all 7 arms (§10; M7 §9.4);
- F-11 via the single extension, at most once, and the void study (§13);
- required configurations not accepted within the hard bound, so the study halts (§13);
- S* = 20 under the cap rule (§13; M7 §12.4);
- the M7 §11.3 degenerate-denominator rule for the headline fraction, via the §12 CI of (A7 − A2) (§12).

### 8.2 Interpretation register (answer every item; do not skip any)

Answer each question below in `INTERPRETATION_REGISTER.md`, in this form:
- `IR-nn`
- your answer
- the exact quoted text it rests on, with section
- status:
  - **TEXT** if the text settles it;
  - **INFERENCE** if it follows from the text by reasoning you state;
  - **UNSPECIFIED** if the text does not settle it (give the reading you implemented).

Your code must implement exactly the answers you give. The questions are neutral: they do not suggest an answer, and no answer from anyone else is available to you.

**Metric layer (run records, fixture M01)**
- **IR-01** Which reward events enter R_W and R_all? (Call index i vs τ; calls 0–4.)
- **IR-02** Goal-reach rate: which events count?
- **IR-03** Half-life:
  - (a) TR(τ) near the shift;
  - (b) behaviour when R_W2 ≤ 0;
  - (c) the strictness of "<" and "≥";
  - (d) what is reported for censored runs.
- **IR-04** Which record field (Appendix E) identifies a decision tick, and which identifies a replay tick?
- **IR-05** How exactly is a candidate's shadow weight computed from the recorded fields? Use Appendix E's fields and Appendix D's code.
  - (a) the role of the recorded pre-clamp F, trust term t, returned value, `applied` flag, arbitration inputs, uncertainty, executive weights and self-loop flag;
  - (b) the ±400 clamp;
  - (c) the 60/40 blend.
- **IR-06** "Candidates whose weight has no trust input keep their weight": which candidate-loop entries, if any, does this apply to in the records?
- **IR-07** argmax₁ and argmax₀ with ties; is argmax₁ from the recorded weights required to equal the recorded `bestChoice` key?
- **IR-08** Flips:
  - (a) over which τ range are flips counted?
  - (b) how are replay ticks counted in the F-2 denominator?
  - (c) the unfiltered denominator;
  - (d) per-window rates.
- **IR-09** Monotonicity diagnostic:
  - (a) how is max_k |T_k − 0.5| obtained from the records?
  - (b) bin boundaries on [0, 0.5], including the endpoints;
  - (c) Spearman ρ of bin index vs rate when a bin is empty;
  - (d) its bootstrap.
- **IR-10** Link ④:
  - (a) the population per A1 run;
  - (b) the meaning of "t ≤ 2980" and "ε ticks included";
  - (c) the fork's switch call;
  - (d) the summation window in both runs (fixture M01 gives fork records).
- **IR-11** Link ② key set:
  - (a) where the raw attempt counts come from;
  - (b) the store values used for trust;
  - (c) mapping a directed key to its edge's `p_e` in the right phase.
- **IR-12** Spearman ρ_run when every qualifying trust value, or every p, is tied.
- **IR-13** Permutation null:
  - (a) what is permuted;
  - (b) one RNG sequence across runs, and across the two snapshots or not;
  - (c) the run order;
  - (d) key order (D-020 pin 6);
  - (e) the shuffle (D-020 pin 5).
- **IR-14** Brier score:
  - (a) "trust just before the attempt": from which recorded fields?
  - (b) the scope of "successes so far + 1 … attempts so far + 2" (per run, per key, or other);
  - (c) what exactly is reported.
- **IR-15** Link ①:
  - (a) n_updates in a run whose store is frozen (A4);
  - (b) the fraction of keys with ≥ 3 raw attempts: which denominator?
  - (c) trust-value entropy bins.
- **IR-16** Steps-to-goal: episode boundaries; censoring at the cap and at run end; the Kaplan–Meier median when the survival curve equals 0.5 exactly; an undefined median as +∞.
- **IR-17** Trajectory entropy and slip rate: which attempts are "realised directed transitions" and which are "drawn, non-goal-entering attempts"?

**Study layer (fixtures S01–S17)**
- **IR-18** Validity: the fixture `valid` field marks a cell whose run had a validity flag false. How do you drop pairs, and which configuration rows does the §12 row rule then remove, in the pilot and in the held-out arrays?
- **IR-19** The estimand is weighted by the goal allocation (8, 8, 7, 7)/30. What exactly is d̄ when rows have been removed?
- **IR-20** A test that is not computable:
  - (a) its p-value and its place in Holm;
  - (b) its 99% CI;
  - (c) the F-criteria that use such a CI (F-4 … F-9; F-11).
- **IR-21** The degenerate case MS_C + MS_S = 0: the CI and t′ that you report.
- **IR-22** Holm: ordering ties among equal p-values; the index i in (7 − i); monotonicity.
- **IR-23** F-11:
  - (a) the 5 × 5 array (which configurations);
  - (b) the pooled 10 × 5 array;
  - (c) dropped cells in the pilot;
  - (d) the extension required but not available within the hard bound;
  - (e) what "Stage 2 does not run" means for the output.
- **IR-24** Power procedure:
  - (a) "final pilot array";
  - (b) MS_CS;
  - (c) the σ̂ components and their square roots;
  - (d) the exact draw order;
  - (e) the §12 test inside the simulation, including the degenerate case;
  - (f) S* and the cap.
- **IR-25** Stage 2 uses which seeds of the 20 the fixture provides?
- **IR-26** F-1:
  - (a) which runs;
  - (b) undefined ρ_run in the mean;
  - (c) the two-way bootstrap: resampling units, "available cells", iterations with no defined value;
  - (d) "CI contains 0".
- **IR-27** F-2: FR filtered vs unfiltered, and the M7 §9.3 exclusion-validity rule. Does anything other than the filtered FR enter the verdict?
- **IR-28** F-3:
  - (a) the sampling procedure step by step: population ordering, the shuffle, run order, keeping the first m, and what happens to dropped samples;
  - (b) CA;
  - (c) its two-way bootstrap (what is resampled; how decisions of resampled runs enter);
  - (d) "undefined".
- **IR-29** F-7: the paired difference (A2 half-life − A1 half-life) and its CI. Which CI, and what "contains or lies below 0" means for firing.
- **IR-30** F-8 and F-9: "≈" per v1.0 §12, at the full Stage-2 n.
- **IR-31** F-10: P̄ (pilot incl. extension) and H̄; configuration means over seeds; dropped pairs; the ratio.
- **IR-32** Headline fraction:
  - (a) the bootstrap statistic;
  - (b) iterations with a zero or undefined denominator;
  - (c) when the fraction is "undefined" (M7 §11.3 via the §12 CI).
- **IR-33** Verdict:
  - (a) precedence among VOID, HALT and the H1 verdicts;
  - (b) the "same window" rule of H1-STRICT;
  - (c) the escalation count (which criteria count);
  - (d) what must be reported.
- **IR-34** Bootstrap mechanics:
  - (a) what counts as "one analysis" for the fresh `makeRng(770002)`;
  - (b) n in ⌊u·n⌋ after rows are removed;
  - (c) ordering of non-finite or undefined iteration values before taking order statistics.
- **IR-35** Descriptive sensitivity analyses:
  - (a) "min F′ with Satterthwaite df": the formula;
  - (b) Wilcoxon (Pratt, two-sided) p-value method;
  - (c) the matched-pairs rank-biserial correlation.
- **IR-36** A5 descriptive reports: "fingerprint A5 ≡ A2, overall and per window"; floor counts in A1 and A5.

## 9. Inputs: the pre-registered synthetic fixtures

Every file in the fixture set is listed with its SHA-256 in Appendix F.3. The schemas, with excerpts, are in Appendix F. In short:

- **S01–S17** (`h1r.d021b.study/1`) — study level.
  - **Pilot:** 10 configurations; indices 0–4 are Stage 1 and 5–9 the single extension, which you may use only if §13 calls for it.
  - **Held-out:** 30 configurations × 20 confirmatory seeds × 7 arms. Use only the seeds §13 selects.
  - **Cells:** R_W1–R_W4, R_all, half-life with censoring flag, validity, fingerprint, floor raises.
  - **A1 link inputs per held-out (configuration, seed):** ρ_run at τ 1499 and 2999 (or `null`); decision, replay and flip counts in total and per window; the link-④ population, i.e. flipped decision ticks t ≤ 2980, each with its fork difference (A1 − fork), or `null` if the fork crashed twice; monotonicity bin counts.
- **M01** (`h1r.d021b.records/1`) — record level.
  - **Run records:** 7 synthetic run records in the exact MS-1 measurement schema (Appendix E), with arms A1, A2 and A4.
  - **Fork records:** 3 fork records of run `m1`, at switch calls 705, 1505 and 2985.
  - **Configuration table:** goal, and `p_e` per undirected edge for Phase I and Phase II.
  - **Graph:** the 20-node, 39-edge graph.

The fixture values are synthetic and do not resemble H1-R outcomes. They carry no expected results; nobody's outputs are included anywhere.

## 10. Output contract (schema `h1r.d021b.output/1`; both implementations must emit it)

```text
{
  "schema": "h1r.d021b.output/1",
  "implementation": { "name": string, "author": string, "runtime": string,
                      "sourceSha256": string, "packageSha256": string },        // not compared
  "study": { "<fixtureId>": StudyResult, ... },                              // S01 … S17
  "records": { "M01": RecordsResult }
}

CI         = { "computable": bool, "C": int, "S": int, "nu": int|null, "dbar": num|null, "se": num|null,
               "lower": num|null, "upper": num|null, "containsZero": bool|null }
Test       = CI + { "MS_C": num|null, "MS_S": num|null, "tPrime": num|string|null, "p": num|null,
                    "pAdjusted": num|null, "confirmed": bool }
BootCI     = { "statistic": num|null, "lower": num|null, "upper": num|null, "nDefinedIterations": int }

StudyResult = {
  "stage1": {
    "droppedPairs": [[configIndex, seed], ...],            // pilot pairs dropped under §10 (sorted)
    "F11": { "initial": { "W1": CI, "W3": CI },            // 5 × 5 array
             "extensionTaken": bool, "extensionUnavailable": bool,
             "final": { "W1": CI, "W3": CI } | null,       // pooled array if the extension was taken
             "fires": bool, "outcome": "PROCEED" | "VOID" | "HALT" },
    "power": null | { "W1": { "muHat": num, "sigma2C": num, "sigma2S": num, "sigma2E": num,
                              "power": [num × 19] },     // S = 2 … 20
                      "W3": { … same … }, "Sstar": int, "underpowered": bool }
  },
  "stage2": null | {
    "seedsUsed": int, "droppedPairs": [[configIndex, seed], ...], "rowsRemoved": [configIndex, ...],
    "family": { "A1vA2": { "W1": Test, "W3": Test }, "A1vA5": { … }, "A1vA6": { … } },
    "ci": { "A1mA2": { "W1": CI, "W3": CI }, "A1mA5": { … }, "A1mA6": { … }, "A4mA1": { … },
            "A3mA1": { … }, "A7mA2": { … }, "HL_A2mA1": CI },
    "F": { "F1": { "rhoMean": num|null, "nDefinedRuns": int, "nUndefinedRuns": int, "ci": BootCI, "fires": bool },
           "F2": { "FR": num|null, "FRunfiltered": num|null, "flips": int, "eligibleTicks": int, "fires": bool },
           "F3": { "CA": num|null, "sample": [[configIndex, seed, t], ...], "nDropped": int, "ci": BootCI, "fires": bool },
           "F4": { "fires": bool }, "F5": { "fires": bool }, "F6": { "fires": bool }, "F7": { "fires": bool },
           "F8": { "fires": bool }, "F9": { "fires": bool },
           "F10": { "Pbar": num|null, "Hbar": num|null, "ratio": num|null, "notAssessable": bool, "fires": bool } },
    "headline": { "W1": { "fraction": num|null, "ci": BootCI, "undefined": bool }, "W3": { … } },
    "verdict": { "result": "H1-STRICT" | "H1 SUPPORTED" | "NOT SUPPORTED", "strictWindow": "W1"|"W3"|null,
                 "fired": ["F-1", …],                       // in the order F-1 … F-10
                 "escalation": bool }
  },
  "verdict": "VOID" | "HALT" | "H1-STRICT" | "H1 SUPPORTED" | "NOT SUPPORTED",
  "descriptive": { … }                                     // self-described keys (§5 "no" rows, sensitivity, A5)
}

RecordsResult = {
  "runs": { "<runId>": {
      "R": { "W1": num, "W2": num, "W3": num, "W4": num }, "goalRate": { … }, "R_all": num,
      "halfLife": { "value": int, "censored": bool },
      "calibration": { "tau1499": { "rho": num|null, "nKeys": int }, "tau2999": { … } },
      "link3": { "decisionTicks": int, "replayTicks": int, "flips": int, "FR": num|null, "FRunfiltered": num|null,
                 "flipTaus": [τ, ...], "population": [τ, ...],
                 "byWindow": { "W1": { "decisionTicks": int, "replayTicks": int, "flips": int }, … },
                 "monotonicity": { "decisions": [int × 5], "flips": [int × 5] } },
      "descriptive": { … } } },                            // permutation p, Brier, curve, link ①, KM, entropy, slip rate
  "forks": { "<forkId>": { "t": int, "baseSum": num, "forkSum": num, "difference": num } }
}
```

In RecordsResult, `link3` is reported for A1 runs only. For other arms it is `null`.

**Agreement rule.** `compare_outputs.mjs` applies D-021: every value outside `implementation` must agree. Strings, booleans, `null` and integers must agree exactly; numbers within 10⁻⁹. `descriptive` blocks are compared on the keys both sides report.

## 11. Deliverables and lodging

Return four files:
1. `h1r_independent_analysis.mjs` (§6, §10).
2. `INTERPRETATION_REGISTER.md`: IR-01 … IR-36, each with its answer, quoted basis and status.
3. `IMPLEMENTATION_NOTES.md`:
   - numerical methods (t distribution, sorting, summation);
   - every random draw sequence, in order;
   - anything you found contradictory in the text.
4. `PROVENANCE.md` containing:
   - your model name and version;
   - the date;
   - the SHA-256 of this package file as given to you;
   - a statement that you saw no other implementation or interpretation of this analysis;
   - a statement that you used only this file and the supplied fixture files, and accessed no web page, GitHub page, repository or other external source;
   - a list of any parts you could not implement, marked `NOT_IMPLEMENTED`. Never omit a part silently.

**Lodging (D-021).** On receipt, the relaying person records the SHA-256 of your four files. They keep the files sealed from the other implementer until both implementations are lodged. Only then do both run on the fixtures and get compared. Any disagreement halts H1-R until its cause is found and corrected, and it is reported. It is never settled by choosing one result.

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

---

## Appendix A — H1-R pre-registration v1.0 (whole file, verbatim)

Source: `research/preregistrations/H1R_PREREGISTRATION_v1.0.md` at source commit `30e7693236309bbfb82b8117b74240fc8ab5d43a` (blob `3ca595d913727291a891e847f0b69319b8d9e1f1`), SHA-256 `c52e73378ad7759fe4e2829e972d1a97b5297da49b327b3c700c654a218ca836`. Relative links inside it refer to repository files that are not part of this package and are not needed.

````markdown
# H1-R pre-registration v1.0: belief-driven adaptation under hidden transition reliability (conformed M7 build)

**Status: FROZEN.** Frozen 2026-10-04 under the Research Director ruling "FINAL FREEZE AUTHORIZATION — H1-R".

**Integrity record:** [`H1R_PREREGISTRATION_v1.0.sha256`](H1R_PREREGISTRATION_v1.0.sha256), SHA-256 over the exact bytes of this file. A mismatch is a protocol deviation and must be reported, never silently reconciled.

**What this document authorises:** nothing is run by it. The measurement-layer milestone (§9) precedes Stage 1, and every gate in §11 must be green before Stage 1 and again before Stage 2.

**Predecessor:** [`M7_PREREGISTRATION.md`](../cognitive-audit/M7_PREREGISTRATION.md) v1.0, frozen 2026-08-19, SHA-256 `2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9`, with errata M7-ERR-01 … M7-ERR-10.

**Inheritance rule:** this document inherits every M7 clause that it does not explicitly supersede. Supersessions are listed in Appendix A. Nothing else is changed. H1-R tests the M7 design **as frozen**, on a runtime made to conform to it.

**Tags:**
- **FROZEN**: binding design;
- **FACT**: verifiable from the repository or committed evidence, with the source cited.

No statement in this document is a recommendation.

---

## 1. Lineage, rulings and build identity

### 1.1 Rulings (all Director rulings, 2026-10-04; decision log entries D-013 … D-018)

| Ruling | Record |
|---|---|
| H1-R conformance authorisation (N1, N2, RANDOM, FROZEN, GOAL/G15′, P4) | `experiments/h1r/evidence_final/` |
| Conformance correction (CRG; N2 clarification; Q-KEY, since superseded by R1) | `experiments/h1r/evidence_r2/CORRECTION_REPORT.md` |
| R1: realised-outcome learning order | commit `742f239`; `experiments/h1r/evidence_r1/R1_REPORT.md` |
| R2: goal-entry reliability draw (D-1) and measurement integrity (D-5, part 1) | commit `19d0786`; `experiments/h1r/evidence_d1d5/R2_REPORT.md` |
| R3: configuration-scoped environment stream (D-3B) | commit `e8e904a`; `experiments/h1r/evidence_r3/R3_REPORT.md`; [`H1R_ERRATUM_R3_ENVIRONMENT_SEED.md`](H1R_ERRATUM_R3_ENVIRONMENT_SEED.md) |
| Freeze of this document (D-2 … D-11) | this file |

### 1.2 Build under test (FACT)
- Instrument commit `e8e904a2f213e45dc0fb326f36cf72809f5862cf`.
- M7 instrument build B2 = `707cb1e5205a7e9979f81092ee1ebfa0fe28922e`, materialised blob by blob with verified blob ids (`build_tree.mjs`).

SHA-256 values below are over **committed blob content at `e8e904a`**.

| File | SHA-256 |
|---|---|
| `experiments/h1r/conformance_transform.mjs` | `cf30e20a71d59a67ba6163c55b94399d5d74f3b4609c6e3ea37e27080d5bfd5a` |
| `experiments/h1r/env_seed.mjs` | `80caf09aae290bc77c9f370dfcaaa531490a2841df801505a31bb7faecdc136e` |
| `experiments/h1r/runtime.mjs` | `48844fc1cff6470bd9f72eb02c8db417ccb4fef1b56db3ba427cfb0ab3469771` |
| `experiments/h1r/run_h1r.mjs` | `0f93fea6842c4eff9b4a619fe2bb09a85e6743cb8cc56b1d5557da8147084616` |
| `experiments/h1r/measure.mjs` | `771dcb466c829e6c37eba6429ffef3a7c9e51540caf04af87813e51eaea9a81e` |
| `experiments/h1r/build_tree.mjs` | `33d5f3d84f2609799f796c5cebede586f6eb5138a4c025a56ac2dace8f160402` |
| `experiments/h1r/verify_conformance.mjs` | `056457b919d2cd53bc1d434fbf7b3f5a845b2de99deb6f13e7c0e986373f1906` |
| `experiments/h1r/run_one.mjs` | `e294ce6561882ba40d1be59e2e75e8b266733daf3c1d5933d5d43029dc4b6f01` |
| `experiments/h1r/run_existing_gates.mjs` | `3bddb021b23f32831fccd8480f6f9f87c9299bed52cc83203f3fc6ff7c1c88a2` |
| `experiments/h1r/verify_hook.mjs` | `2adb49deaa8a3e2b66fc2ba1389252b6c10a3800ddb3e2f1d13a8176a3b66006` |
| `research/preregistrations/H1R_ERRATUM_R3_ENVIRONMENT_SEED.md` | `bf3bd47306853300df9518c1c043638bbdda1864bd51802b092837f0a6761888` |

**Conformed files** (blob → SHA-256 before → after, `evidence_r3/conformance_gates.json`):

| File | Blob | SHA-256 before | SHA-256 after |
|---|---|---|---|
| `main.js` | `113fa47` | `537f37a2…` | `c5c3828adb4eeb9154289bac4010801f49a8061b9f1211ac72bf6f572d83d206` |
| `render/qlearning.js` | `d021bb0` | `a3d4f4b8…` | `fdc2798c3b40559ecf9342cc817db3da8699deba3dc0cf35b1aaf51de68c939d` |
| `render/episodeManager.js` | `c00c3b5` | `757d549b…` | `a8fd8dec477204c1e4a076975919f5efd138529ff1d12d84737f8362532e7eac` |
| `instrumentation/rng.js` | `7d0c4ff` | `8ec69622…` | `289d9229a6a3cfff579ecffb4bea23205a19e9e11a2e3e8b6dbe70134a0a2cc0` |

**Verification at this build (FACT, `experiments/h1r/evidence_r3/`):**
- 469 single-process runs, 0 errors: 71 PASS, 3 FAIL (F2, G15′ and P1, classified in §11), 5 INFO.
- Existing gates: OFF ≡ pristine on 25/25 scripts; ON identical to the R2 evidence (608 PASS / 12 FAIL, classified).

**FROZEN, instrument identity across stages:**
- The measurement-layer milestone (§9) will change the transform. Its SHA-256 values, and that of `analyze.js`, are recorded **before the first Stage-1 run**.
- Instruments and analysis code are identical in Stage 1 and Stage 2.
- Any change after Stage-1 data exist is a reported protocol deviation.

---

## 2. Supersessions of the frozen M7 text (summary; register in Appendix A)
- **Runtime conformance** (validity repairs): N1, N2, A3, A4, GOAL, P4, CRG, R1 (H1R-S1), R2 (D-1), R3 (§5.1 environment stream).
- **Interpretation notes:** H1R-S2 and H1R-S3 (the §10.1/§10.2 premises do not hold).
- **Gate specifications:** H1R-S4 (G8.4c) and H1R-S5 (G15 → G15′).
- **Sampling:** pilot material (§7).
- **Analysis:** the confirmatory test and its CIs (§12); the power procedure (§13).
- **Specification of frozen-but-unpinned items:** §6, §8, §10, §14.
- **Waiver of an exploratory component:** §15.

**No hypothesis, arm, window, primary metric, α, family membership, falsification threshold or claim-ceiling clause is changed.**

---

## 3. Scientific question and hypotheses (FROZEN, M7 §2, unchanged)

The question: does a calibrated internal estimate of a hidden per-edge transition property causally change action selection and improve outcomes and post-shift re-adaptation? The estimate is the existing Beta-Bernoulli path-trust estimator, credited by traversal outcome. The comparison is with the same agent with that estimate severed, in the identical state, under the identical RNG streams.

- **H1:** the estimator (1) converges toward `p_e`; (2) changes action selection at a measurable rate; (3) produces changed decisions that yield higher subsequent return than the belief-severed agent's, in the identical state under the identical RNG stream.
- **H0:** with belief severed, performance, adaptation speed and post-shift recovery are statistically indistinguishable at the Stage-2 sample size.
- **H1-strict:** H1 holds **and** the advantage survives against A5 **and** A6. Only H1-strict licenses causal language.
- **Competing hypotheses A–E:** as frozen M7 §2.4.

The mechanical verdict is §14.

---

## 4. Environment and runtime semantics (FROZEN, as built at `e8e904a`)

**Graph.** 20 nodes and 39 undirected `connections.json` edges, traversable both ways. No topology change.

**Hidden variable.**
- 13 UNRELIABLE edges with `p_e` ~ U(0.25, 0.45); 26 RELIABLE edges with `p_e` ~ U(0.90, 1.00).
- `p_e` is symmetric per undirected edge.
- At tick 1500 the two sets swap silently.
- The secondary Beta(2,2) regime is unchanged and exploratory (M7 §3.5).

**Transition process** (M7 §3.3; R1; R2). For each movement decision there is exactly one draw from `liveRng("environment")`, before the self-learning section.

| Case | Learning (existing rules on the realised transition) | Trust |
|---|---|---|
| Success u → v | the full self-learning section on u → v (reward, prediction error, Q(u, v) with S′ = v); return moves included | a(u→v) += 1, s(u→v) += 1 |
| Slip u ↛ v | the realised transition is u → u, which the section's existing entry guard excludes: no reward, no prediction error, no Q update | a(u→v) += 1 |
| Goal entry u → g (R2) | draws like any edge. On success: learns with a flat +12 and S′ = goal, the existing reset follows. On a slip: an ordinary slip, with no reset. | credited like any traversal |

**Reward** (M7 §3.4, GOAL): +12 on a realised goal entry; otherwise +2 if sim(u, v) > 0.45, +0.3 if sim(u, v) > 0.15, and −0.4 otherwise. `sim` is the cosine similarity of the agent's neuron embeddings.
- FACT: the boot embeddings are a function of the agent seed. During a run, `_learnSemantic` → `trainEmbedding` moves them along learned episode transitions (`render/episodeManager.js`, `render/embeddings.js`, B2).
- FACT: `rewardSignal` exists only on ticks whose self-learning section runs (a realised move or goal entry).

**Environment stream (R3, erratum).** `envSeed = (0x60800000 + slot · 4096 · 0x6d2b79f5) mod 2^32`, with `slot = (agentSeed − 20260819000)·64 + blockCode·32 + acceptedConfigIndex`; blockCode 0 = pilot, 1 = held-out.
- There is no arm term.
- The verified domain is agent seeds 20260819000–009 and 100–119, both blocks, index 0–31. Any other position is refused.

**Observability** (M7 §3.8). The agent never observes `p_e` or a labelled slip.

**Run structure.**
- 3000 ticks; Phase I is τ 0–1499 and Phase II is τ 1500–2999 (§6).
- Goal = `GOALS[configIndex mod 4]` over {8, 12, 16, 19}.
- An episode ends at a goal reach or at the 150-tick cap.
- P4 clears the pre-reset reasoning at both reset sites.
- Run settings: `envMode = on`, `creditMode = on`, `pin = on`, `tickUnit = 'step'`, `ticks = 3000`, one OS process per run, cold `localStorage`.
- The runtime is installed with `trustMode = 'traversal'`.

**Learning-authority pins** (M7 §10.2): learning authority ≡ 1.0 and `dampQ` disabled in every arm, with G12 binding.

---

## 5. Arms (FROZEN, M7 §4; semantics as built)

| Arm | E3: per-edge `bayesianTrust` | E4: aggregate | Learning | Selection |
|---|---|---|---|---|
| A1 BELIEF | raw | raw | all | normal |
| A2 ABLATION | 0.5 | null | all | normal |
| A3 RANDOM | raw | raw | all | the executed step-0 action is uniform over graph neighbours (one cognitive draw) |
| A4 FROZEN | raw | raw | no Q write and no trust write (Q- and trust-frozen; other stores adapt) | normal |
| A5 AGGREGATE-ONLY | 0.5 | raw | all | normal |
| A6 SHUFFLED | trust(σ(e)), with σ a fixed derangement seeded by `agentSeed XOR 0xBEEF`; canonical direction of the mapped edge | raw | all | normal |
| A7 ORACLE | configured `p_e` of the current phase (`env.trueP`) | raw | all | normal |

Held identical across arms within a (configuration, seed) cell (M7 §4.3, §5.2): graph, `{p_e}`, goal, configuration seed, agent seed, every stream initialisation (including the R3 environment stream), the tick budget, every scoring coefficient, and the learning-authority pins.

---

## 6. Ticks, phases and windows (D-6, FROZEN)
- One tick = one `runAgent()` call (`tickUnit = 'step'`).
  - FACT: every run makes exactly 3,005 calls, of which `pressSpace` runs the first 5.
- **τ = i − 5**, where i is the 0-based `runAgent()` call index (the `measure.mjs` event index). Calls 0–4 belong to no window.
- Phase II iff τ ≥ 1500. This is exact, because `env.setTick(5l)` precedes loop l.
- Windows (inclusive):

  | Window | τ range | Role |
  |---|---|---|
  | W1 | [0, 299] | primary |
  | W2 | [300, 1499] | descriptive |
  | W3 | [1500, 1799] | primary; carries the ERR-07 §3.1 limitation |
  | W4 | [1800, 2999] | descriptive; a null is predicted |

  Window sizes |W| are 300, 1200, 300 and 1200.
- "At τ = 1499" means after call 1504, at the loop boundary before `setTick(1500)`. "At τ = 2999" means after call 3004.

---

## 7. Seeds, configurations and streams (D-2, FROZEN)
1. **Pilot configurations.** The ERR-07 sequential accepted stream from configuration seed **886000** (`generateAcceptedStream` semantics; configIndex = accepted index i; goal = GOALS[i mod 4]). Pilot = indices 0–4. **Hard bound 889999:** if the configurations required at any point are not accepted at or below 889999, no further run starts, and the study halts and is reported, with no continuation.
2. **Pilot agent seeds:** 20260819004–008. 20260819009 is not used.
3. **Extension** (M7 §15.0; at most once; §13): accepted indices 5–9 of the same stream × the same seeds 004–008. The pooled pilot is 10 × 5, fully crossed.
4. **Confirmatory material.** The 30 accepted configurations of the ERR-07 stream from 900500. Agent seeds are the first S* of 20260819100–119, ascending.
5. **R3 positions:** (agentSeed, `pilot` | `heldout`, accepted index).
6. **Registry actions before any generation:**
   - record the H1-R pilot configuration block 886000–889999;
   - record trajectory records (H1-R, pilot) for 20260819004–008;
   - record (H1-R, registered) for the confirmatory seeds used;
   - record H1-R's use of the held-out stream before Stage 2.

---

## 8. Outcomes and metric definitions (D-4, FROZEN)

**Primary metric** (M7 §8.5). For each run and window, `R_W = ( Σ r over events [i, r] with τ = i − 5 ∈ W ) / ( |W| / 100 )`.
- A tick without an event contributes 0.
- Stale and replay ticks are not excluded.

**Goal-reach rate** = (number of events with r = 12 and τ ∈ W) / (|W|/100).

**Post-shift recovery half-life** (M7 §8.5):
- TR(τ) = Σ r over τ′ ∈ [τ − 99, τ];
- thr = 0.5 · R_W2;
- t_below = the first τ ∈ [1500, 2999] with TR(τ) < thr. If there is none, HL = 0;
- otherwise t_rec = the first τ ∈ (t_below, 2999] with TR(τ) ≥ thr, and HL = t_rec − 1500. If there is no t_rec, HL = 1500 (right-censored; the censoring count is reported per arm).

**F-10 measure.** For arm A1, `R_all = Σ r over τ ∈ [0, 2999] / 30` per run.
- P̄ = the mean of the pilot configuration means (Stage 1, extension included).
- H̄ = the mean of the held-out configuration means.

**Link ③ flip rate (A1 runs).**
- A **decision tick** is a τ on which `runPrediction` step 0 writes a non-null selection.
- argmax₁ = the first key of the existing stable descending sort of the A1 weights.
- The **shadow weight** of a candidate replaces the delivered T by 0.5 in both the pre-clamp score F and `arbitrate`'s `confidenceScore`; each changes by −12(T − 0.5).
  - Every other input stays at its A1 value, including the realised `drift` value, the executive weights and A1's `confidenceState`.
  - The ±400 clamp is re-applied.
  - The shadow never calls `calculateDecisionScore`.
  - Candidates whose weight has no trust input keep their weight.
- argmax₀ = the first key of the same stable sort of the shadow weights.
- A flip is argmax₁ ≠ argmax₀, regardless of ε-exploration.
- **F-2 statistic:** FR = Σ flips / Σ(3000 − replay ticks), pooled over all Stage-2 A1 runs.
- Also reported: the unfiltered rate (Σ flips / Σ 3000), per-window rates, and the monotonicity diagnostic (decision ticks binned by max_k |T_k − 0.5| into 5 equal-width bins on [0, 0.5]; Spearman ρ of bin index against rate, with the §12 bootstrap CI).

**Link ④ conditional advantage.**
- **Population:** flipped decision ticks t ≤ 2980 of each A1 run, ε ticks included.
- **Sample:** m = 10 per run, or all if fewer. `makeRng(770004)` drives a Fisher–Yates permutation of each run's population sorted by t; runs are taken in (configuration index, then seed) ascending order, and the first m are kept.
- **Fork:** a fresh process replays the identical A1 run and switches the E3 and E4 deliveries to A2's immediately before call t + 5.
- **CA** = the mean over the sampled decisions of [Σ r over τ ∈ [t, t+20) in A1] − [the same in the fork].
- A crashed fork is re-run once; if it crashes again, the sample is dropped and reported.

**Link ② calibration (A1 runs).**
- **Keys:** directed keys `u->v`, goal-entering keys included, with ≥ 5 raw attempts within the phase ([0, 1499] for τ = 1499; [1500, 2999] for τ = 2999).
- trust = (s+1)/(a+2) from the store at τ; p = that phase's configured `p_e`.
- **ρ_run** = Spearman with average ranks. It is undefined if fewer than 3 keys qualify, and the count of undefined runs is reported.
- **F-1 statistic:** the mean of ρ_run over A1 runs at τ = 1499.
- **Permutation null:** 10,000 shuffles per run, using one `makeRng(770003)` sequentially over runs in (configuration index, then seed) order.
- **Brier score:** over every drawn attempt, using the key's trust just before the attempt, against the prequential base rate (successes so far + 1)/(attempts so far + 2).
- Also reported: a calibration curve (10 equal-width trust bins at τ = 1499) and the rank partial correlation controlling for raw attempts.
- Undirected pooled variant (descriptive): (s₁ + s₂ + 1)/(a₁ + a₂ + 2).

**Link ①.**
- n_updates = trust-attempt increments in W;
- at τ = 1499 and 2999, the fraction of attempted keys with ≥ 3 raw attempts;
- trust-value entropy in bits, over 10 equal-width bins.

**Steps-to-goal.**
- Episodes split at goal and cap resets.
- Per run, the Kaplan–Meier median, censored at the cap and at the run end. An undefined median counts as +∞ in the median of run medians.

**Trajectory entropy.** Bits, over realised directed transitions in W.

**Slip rate.** Over drawn, non-goal-entering attempts in W; goal-entering attempts are reported separately. Descriptive.

All metrics are computed by `analyze.js` (§1.2 identity rule).

---

## 9. Measurement status and the required milestone (D-5, FROZEN)

**FACT:** `run_h1r.mjs` saves the reward events `[callIndex, rewardSignal]`, `calls`, the fingerprint, `envCounters` and the validity flags.

**Measurable now:**
- R_W in all windows;
- F-4, F-5, F-6, F-8, F-9, F-11;
- the headline fraction;
- goal-reach rate;
- half-life and F-7;
- F-10;
- A5 ≡ A2 identity;
- whole-run n_updates.

**Must exist and be verified before Stage 1** (neutrality, exactness and anti-vacuity gates for each):
1. per-tick records: replay, decision and no-commit flags;
2. per-attempt records: τ, edge, goal-entering flag, outcome, prior trust;
3. goal and cap reset events;
4. trust snapshots with raw per-phase attempt counts at τ = 1499 and 2999;
5. A1 and shadow weights, with an observational pre-clamp probe in `render/scoring.js`;
6. the A5 floor-binding counter;
7. the fork driver and mid-run arm-switch hook, with three gates:
   - a no-switch fork reproduces the original run;
   - a switch at call 0 reproduces the A2 run;
   - a fork equals the original for τ < t;
8. `analyze.js`;
9. the run orchestrator, with registry checks;
10. the registry records of §7.

---

## 10. Inclusion, exclusion and validity (D-7, FROZEN; M7 §9 unchanged)
- **Stale exclusion.** Stale-execution ticks (= replay ticks, ERR-08) are excluded from links ③ and ④ only, with filtered and unfiltered results reported (M7 §9.3). Under ERR-08 the stale ticks carry no selection, so the numerators are identical and only the denominators differ.
- **Validity failures.** Any of the 11 validity flags false = a crash under M7 §9.4: the whole (configuration, seed) pair is dropped from all 7 arms, counted and reported. The 11 flags are:
  - `completed`, `episodeCapArmed`, `replayCooldownDeterministic`;
  - `runtimeAttached`, `transformMatches`, `measurementClean`;
  - `envStreamScoped`, `envDrawsWithinReserve`, `cognitiveDrawsWithinReserve`, `visualDrawsWithinReserve`, `envSegmentDisjointFromConfig`.

  §12's row rule then applies.
- A registry refusal at planning time is not an exclusion: the run never executes.
- Runs without a goal reach are included (M7 §9.4).
- No other exclusion exists (M7 §9.5).

---

## 11. Gate battery (D-8, FROZEN)

**Blocking before Stage 1 and again before Stage 2:**
- **Frozen:** M7 G1–G6 and G8–G16, with H1R-S4 and H1R-S5.
- **Conformance:**
  - X0, G1′;
  - A1–A6, A-AV;
  - R1a–R1e, R1-AV;
  - R2a, R2c, R2d, R2e, R2x, R2-AV;
  - B1–B3, B-AV;
  - C1–C3, C-AV;
  - D1–D3, D-AV;
  - E1, E2, E-AV;
  - F1, F2′, F-AV;
  - G15′-S, G15′(9.4);
  - S1–S6, T1;
  - P2, P3;
  - M1–M5, M-AV;
  - R3-F, R3a, R3b, R3c, R3c2, R3d, R3e, R3h, R3j, R3-DRV, R3-CAL, R3-AV;
  - H1, H2;
  - every gate of the §9 milestone.

**Non-blocking, reported:**
- R2b (it pools arms that share a stream by design; R3-CAL is the calibration gate);
- P1 (A2 ≡ A5 on 7/41 diagnostic configurations at `e8e904a`);
- F2 and G15′ as originally declared (they contradict M7 §9.4);
- the INFO gates;
- the classified historical-verifier failures with conformance ON: e1e2 G1f/AV8b, cap B1/B3/B4/H7, goal B2/B3, stepledger A3, S1b S1.7, S2 S2.4b.

Any blocking-gate failure halts the study (M7 §9.4).

---

## 12. Confirmatory test (supersedes frozen §11.2's test and §11.4's clustering for paired differences)

For comparison k ∈ {A2, A5, A6} and window W ∈ {W1, W3}, let d_cs = Y^{A1}_cs(W) − Y^{k}_cs(W) over the complete C × S array of held-out configurations and confirmatory seeds.

- **Model:** d_cs = μ + α_c + β_s + ε_cs, with crossed, independent, mean-zero random configuration and seed effects.
- **Estimand:** μ is the mean paired difference over accepted configurations, weighted by the fixed goal allocation (8, 8, 7, 7)/30, and over agent seeds.
- **Statistic:** t′ = d̄ / √((MS_C + MS_S)/(C·S)), with MS_C = S·Σ_c(d̄_c· − d̄)²/(C−1) and MS_S = C·Σ_s(d̄_·s − d̄)²/(S−1). It is referred to Student's t with ν = min(C−1, S−1) degrees of freedom, giving a two-sided p. MS_CS is not used in the test.
- **Degenerate case:** if MS_C + MS_S = 0, then p = 1 when d̄ = 0, and p = 0 otherwise.
- **Holm:** the six p-values {A1vA2, A1vA5, A1vA6} × {W1, W3} are Holm-adjusted, p̃₍ⱼ₎ = max_{i≤j} min(1, (7−i)·p₍ᵢ₎). A member is **confirmed iff p̃ < 0.01 and d̄ > 0**.
- **99% CI:** the 99% CI of a paired difference is d̄ ± t_{ν,0.995}·√((MS_C + MS_S)/(C·S)). A CI "contains 0" iff lower ≤ 0 ≤ upper. This CI is used for "≈" (frozen §15.0), F-4 to F-9 and F-11 (on the pilot array).
- **Incomplete arrays:** any configuration row containing a dropped cell is removed before testing. If fewer than 2 rows or 2 seeds remain, the test is not computable and the comparison is not confirmed.
- **Descriptive only:** MS_CS, the variance components and every Satterthwaite or Wilcoxon variant.

**Further frozen analysis elements**
- **Two-way (pigeonhole) bootstrap.**
  - B = 10,000. Each analysis starts a fresh `makeRng(770002)` (mulberry32, `instrumentation/rng.js`).
  - Each iteration draws C configuration indices, then S seed indices, uniformly with replacement (⌊u·n⌋), and recomputes the statistic on the available cells.
  - The 99% interval is the 50th and 9,950th order statistics (1-based).
  - Used for: the headline fraction (A1 − A2)/(A7 − A2) per primary window; the F-1 mean ρ; F-3; the link ③ monotonicity diagnostic; and descriptive link CIs.
  - The headline-fraction degenerate-denominator rule (M7 §11.3) uses the §12 CI of (A7 − A2).
- **Effect sizes:** d̄; the variance components σ̂_c² = max(0, (MS_C − MS_CS)/S), σ̂_s² = max(0, (MS_S − MS_CS)/C), σ̂_e² = MS_CS; and the matched-pairs rank-biserial correlation on configuration means. All descriptive.
- **Sensitivity analyses** (descriptive; disagreement in sign with the primary is reported as a finding):
  - min F′ with Satterthwaite df;
  - Wilcoxon (Pratt, two-sided) on all cells;
  - Wilcoxon on configuration means;
  - Wilcoxon on seed means.
- **Basis** (Appendix B.2). The test's size is ≤ α for every σ_c², σ_s², σ_e² ≥ 0 and every C, S ≥ 2, under normal, independent effects in a complete array. The proof:
  - D = (MS_C + MS_S)/(CS) = aU + bV′ with a + b = Var(d̄) + σ_e²/(CS);
  - g(x) = 2[1 − Φ(c√x)] is convex;
  - χ²_m/m ≤_cx χ²_k/k for m ≥ k = min(C−1, S−1).

---

## 13. Stage 1, the single extension, and Stage 2 (frozen §12 and §15.0 made exact)

Stage 1 uses the first 5 accepted configurations (indices 0–4) of the ERR-07 sequential stream from configuration seed 886000 (hard bound 889999), × agent seeds 20260819004–008 × 7 arms, at R3 positions (seed, pilot, index).

- **F-11 first.** F-11 is evaluated first: the §12 99% CI of (A7 − A2) on the 5 × 5 array, in W1 and W3.
  - If the CI excludes 0 in at least one window, there is no extension.
  - If it contains 0 in both, exactly one extension runs: indices 5–9 of the same stream × the same seeds × 7 arms.
  - F-11 is then re-evaluated once on the 10 × 5 array. If the CI still contains 0 in both windows, the study is void and Stage 2 does not run.
  - If the required accepted configurations do not exist at or below 889999, the study halts and is reported.
- **What Stage-1 data are for:** only the gates, F-11, the variance components of the power procedure (on the final pilot array), and F-10's pilot reference. They never enter a §12 test. They may void, size or veto, but never support an H1 verdict.
- **Fixed before Stage 2:** S* and the go/void decision are fixed before any Stage-2 run.
- **Single analysis:** Stage-2 data are analysed once, after all Stage-2 runs and validity checks, by the `analyze.js` whose SHA-256 was recorded before the first Stage-1 run.
- **Reporting collision facts:** configuration-generator contacts are reported as exact enumerations over (cell, candidate) pairs. Probabilities are labelled model-based (geometric acceptance at the ERR-09 rates; union bound over cells) and given at point and conservative rates (Appendix B.1).

**Power procedure** (supersedes frozen §12.3 steps 1–3):
1. From the final pilot array of A1 − A2 cell differences, for each W ∈ {W1, W3}: μ̂ = d̄ and σ̂_c², σ̂_s², σ̂_e² (§12), used as they are.
2. For each S ∈ {2, …, 20}, run B = 10,000 iterations:
   - draw a_c ~ N(0, σ̂_c²) for 30 configurations, b_s ~ N(0, σ̂_s²), and e_cs ~ N(0, σ̂_e²), with normal deviates from `makeRng(770001)` through Box–Muller in the fixed order a, b, e (row-major);
   - form d_cs = μ̂ + a_c + b_s + e_cs;
   - apply the §12 test and reject iff p < 0.01/6.
3. S* = the smallest S with power ≥ 0.80 in both W1 and W3; otherwise S* = 20, and the cap rule (frozen §12.4) applies unchanged.
4. Confirmatory runs = 30 · S* · 7, using the first S* of 20260819100–119.

**No optional stopping (FACT, structure of the protocol).**
- Stage-1 outcomes reach Stage 2 only through the go/void decision and S*, both fixed before any Stage-2 run.
- Stage-2 cells share no configuration seed, agent seed, R3 environment segment or configuration-generator segment with Stage 1. The only cross-stage contacts (an environment segment touching a candidate generator) are enumerated, with their model probabilities, in Appendix B.1.
- The §12 test has size ≤ α at every fixed S, so P_H0(confirmation) = Σ_S P(S* = S) · P_H0(reject | S) ≤ α.
- There is no interim look at Stage-2 outcomes.
- **Stage 1 is never reported as evidence for or against H1.**

**Determinism re-runs.** Every arm of the cell (configuration with index c ≡ 0 mod 5, first seed) is re-run in fresh processes, in both stages. Any fingerprint mismatch halts the study.

---

## 14. Falsification criteria and verdict function (pins frozen §2, §15, §16 and §18)

A criterion based on a 99% CI of a difference fires when the CI contains 0. F-3 and F-7 also fire when the CI lies below 0. F-1 and F-3 fire when their statistic is undefined.

| Criterion | Fires iff (frozen thresholds; windows and directions pinned) |
|---|---|
| F-11 | §13 procedure: the (A7 − A2) CI contains 0 in both W1 and W3 after the single extension (the study is void) |
| F-1 | mean ρ_run at τ = 1499 < 0.30, or its CI contains 0, or the statistic is undefined |
| F-2 | FR < 0.01 |
| F-3 | the conditional-advantage CI contains 0 or lies below 0, or CA is undefined |
| F-4 | the (A1 − A2) CI contains 0 in both W1 and W3 |
| F-5 | the (A1 − A6) CI contains 0 in both W1 and W3 |
| F-6 | the (A1 − A5) CI contains 0 in both W1 and W3 |
| F-7 | the CI of the paired (A2 half-life − A1 half-life) contains 0 or lies below 0 |
| F-8 | A4 ≈ A1: the (A4 − A1) CI contains 0 in both W1 and W3, at the full Stage-2 n |
| F-9 | A3 ≈ A1: the (A3 − A1) CI contains 0 in both W1 and W3, at the full Stage-2 n |
| F-10 | P̄ > 0 and H̄/P̄ < 0.60. If P̄ ≤ 0 it does not fire, and the verdict carries "memorisation not assessable". |

**Verdicts:**
- **H1 is SUPPORTED iff** at least one A1vA2 member is confirmed, **and** none of F-1, F-2, F-3, F-7, F-8, F-9 or F-10 fires.
- **H1-STRICT iff** H1 is SUPPORTED, **and** there is a window W ∈ {W1, W3} in which A1vA2, A1vA5 and A1vA6 are all confirmed, **and** neither F-5 nor F-6 fires.
- Otherwise the verdict is **NOT SUPPORTED**. Every criterion that fired is reported, and frozen §16 and §18 apply as written, including escalation when three or more of F-1 to F-10 fire.
- No other rule, window, metric or exclusion may enter the verdict.
- If F-11 fires, the study is void and no verdict is issued.
- The secondary-regime trigger is unchanged (M7 §3.5).

---

## 15. A5, exploratory components and descriptive reports (D-9, D-10, FROZEN)
- **A5** is retained unchanged (M7 §4.2). Reported descriptively:
  - the count of (configuration, seed) cells with fingerprint A5 ≡ A2, overall and per window;
  - the number of `updateBehavior` calls in which the aggregate floor raised `confidenceState`, in A1 and A5.
- **Interpretation rule:** F-6 not firing establishes only that the gain is not attributable to this system's global-reliability route.
- **The exploratory 2×2 PE factorial (M7 §10.2) is WAIVED.** Under R1 no slip reaches the prediction-error pathway, state prediction error is 0 by construction in B2, and running the factorial would need an arm variant that does not exist.

---

## 16. Claim ceiling (FROZEN, M7 §17)

The M7 §17 ceiling, scoped claim and forbidden words apply unchanged. Two qualifiers are required with any claim:
- "under realised-outcome learning (R1)";
- "where FROZEN means Q- and trust-frozen".

---

## 17. Governance and records (D-11, FROZEN)
- **Decision log:** `research/09_decisions.md`, entries D-013 … D-018 (the H1-R rulings and this freeze).
- **The three M7 governing documents** are committed with `-text`, at these SHA-256 values:

  | Document | SHA-256 |
  |---|---|
  | `M7_SCIENTIFIC_SPEC_DRAFT.md` | `27865156379bbe39402b96665154b96b5f79dfd36d0fbbf689f6d0b40d360d57` |
  | `M7_GATE_SEMANTICS_AUDIT.md` | `ee09a15549d73f06af36caaf0672dce0682fc8e3947c37c69bec41e30f64560d` |
  | `M7_CHARACTERIZATION_FINDINGS.md` | `6b79436e4afdb06ab8dc4b58a5e7f56e2103c854669ce58c25c850d0747383fd` |

- **This file and its integrity record** are committed with `-text`.
- **Freeze consistency check:** `node research/preregistrations/h1r_v1_checks/verify_freeze.mjs`.

---

## 18. Researcher-degrees-of-freedom register

M7 §19 applies in full. Additional pins:

| Choice | Pinned in |
|---|---|
| Learning order, slip semantics, goal-entry draw | §4 (R1, R2) |
| Environment stream | §4, R3 erratum |
| Tick unit, index, windows, snapshot points | §6 |
| Pilot and confirmatory material, positions, bound | §7 |
| Every metric definition | §8 |
| Validity handling | §10 |
| Gate battery | §11 |
| Test, df, Holm, CI, row rule, undefined cases | §12 |
| Bootstrap, effect sizes, sensitivity | §12 |
| Extension trigger, pilot data use, power procedure, no interim look | §13 |
| Falsification windows and directions; verdict function | §14 |
| Analysis seeds | 770001 (power), 770002 (bootstrap), 770003 (permutation), 770004 (link ④ sample) |
| Analysis-code identity | §1.2 |

---

## Appendix A — Supersession register (H1-R only; M7's own record is not altered)
- **H1R-S1** replaces two M7-ERR-05 §3.1 sentences:
  - replaced: "Everything before it in the tick (decision, scoring, Q-learning, prediction error, reward) and everything after it runs unchanged on both outcomes." and "The attempt is evaluated exactly once at the block entry.";
  - replacement: for each movement decision, `env.attempt(u, v)` is evaluated exactly once, immediately before the self-learning section, from `liveRng("environment")`; the E1 site reuses the outcome. The section runs on the realised transition. A slip (u → u) is excluded by the existing entry guard, so it costs only the elapsed tick. E1′ performs the move, and E2 credits the intended edge.
  - Authority: R1 (`742f239`).
- **H1R-S2:** M7 §10.1 premise sentence 1 does not hold for H1-R. Slipped attempts do not update Q under R1, and there is no step cost. The design consequences it motivated are unchanged.
- **H1R-S3:** M7 §10.2 premise sentence 1 does not hold for B2 or H1-R (state prediction error is 0 by construction). The pins and G12 remain binding.
- **H1R-S4:** G8.4c becomes "≥ 0, reported"; the G8.4b identity remains binding.
- **H1R-S5:** G15 is superseded by G15′ (G15′-S, F1, F2′, F-AV, G15′(9.4)).
- **G14 reading** (clarification): on a slip, nothing about v enters learning, reward or prediction error; u remains `agentCurrent`; the intended edge receives the trust attempt.
- **R2 (D-1):** goal-entering attempts draw and are credited like every edge (M7 §3.3, §6.1).
- **R3:** the M7 §5.1 environment-stream row is superseded for H1-R by `H1R_ERRATUM_R3_ENVIRONMENT_SEED.md`.
- **Sampling:** the M7 §5.1 and §12.1 pilot material (configurations 900000–900004 and seeds 20260819000–004) and the §15.0 extension material (900005–900009, 20260819005–009) are superseded by §7 and §13.
  - FACT: the frozen pilot resolves to 3 distinct `p_e` vectors, and its configurations are consumed in the registry.
  - FACT: seeds 000–003 are refused for H1-R by the registry, and only 004–009 are both available and inside the R3 domain.
- **Analysis:** M7 §11.2's test (Wilcoxon over cells) and §11.4's configuration clustering for paired differences are superseded by §12. §12.3 steps 1–3 are superseded by §13.
- **Waiver:** the M7 §10.2 exploratory factorial (§15).

## Appendix B — Frozen facts and reproducible checks (no agent run; no configuration generated; no outcome)

### B.1 Configuration-generator contacts and cross-stage disjointness
Command: `node research/preregistrations/h1r_v1_checks/config_generator_contacts.mjs`

A (cell, candidate) pair "touches" when the cell's environment segment and the candidate's generator segment share a mulberry32 state.
- Reserve rule: environment 4,096 draws, generator 1,024.
- Actual rule: environment ≤ 3,000 draws, generator exactly 756.

| Statement | Type | Sample space / denominator | Value |
|---|---|---|---|
| Pilot contacts | EXACT count | 200,000 pairs: 5 seeds × 10 indices × candidates 886000–889999 | 0 (both rules) |
| Confirmatory contacts | EXACT count | 36,000,000 pairs: 20 seeds × 30 indices × candidates 900500–960499 (model mass of A₂₉ beyond 960499 is 0 to 9 decimals) | 44 (reserve) / 31 (actual) |
| Generator self-overlap, 886000–960499 | EXACT | every separation 1 … 74,499 | minimum 14,173 draws (needs < 756) |
| Cross-stage environment contacts | EXACT count | pilot cells × held-out candidates; confirmatory cells × pilot candidates | 3; 2 |
| P(some confirmatory cell flagged) | MODEL, union bound | independent Bernoulli acceptance per goal index (rates 7, 11, 14, 9 of 470; ERR-09 samples), sequential walk from 900500; Σ over 600 cells of P(accepted seed ∈ contacting set) | reserve 1.95 × 10⁻⁶ (point), 8.37 × 10⁻⁴ (one-sided 95% lower rates), 9.54 × 10⁻⁴ (half rates); actual shared state 3.20 × 10⁻¹⁴, 6.33 × 10⁻⁷, 9.10 × 10⁻⁷ |
| P(10 pilot configurations within 889999) | MODEL | the same process from 886000 | 1.0000000000 (point); 0.9999999644 (95% lower); 0.9999999724 (half) |
| Cross-stage: P(some touched candidate accepted) | MODEL | the same process | pilot→held-out 3.04 × 10⁻⁹⁴ / 1.56 × 10⁻³⁸; confirmatory→pilot 8.45 × 10⁻⁷ / 8.62 × 10⁻⁴ |
| "≈ 1 × 10⁻⁶ per run" (former R3 report wording) | **WITHDRAWN** | one generator start uniform on 2³² states: 5,119/2³² = 1.19 × 10⁻⁶ | wrong model, not used (Appendix C) |

A flagged cell is dropped under §10. The per-run flag `envSegmentDisjointFromConfig` is evaluated under the reserve rule.

### B.2 Size of the §12 test
Command: `node research/preregistrations/h1r_v1_checks/min_f_size_simulation.mjs`

This is a supporting illustration only; the bound itself is the analytic proof in §12. Rejection rate at α = 0.01 under μ = 0, 20,000 replications, 46 scenarios (C ∈ {5, 10, 30}, S ∈ {2, 3, 5, 8, 10, 20}, normal and t₃ effects):

| Test | Maximum rejection rate |
|---|---|
| Frozen test | 0.0103 |
| Satterthwaite min F′ (descriptive) | 0.078 (at C = 30, S = 2) |
| Configuration-means t | 0.888 |
| All-cells t | 0.747 |

### B.3 Registry status
Command: `node research/preregistrations/h1r_v1_checks/pilot_registry_status.mjs`
- Configurations 886000–889999: neither held out nor consumed.
- Configuration 900500: held out.
- Trajectory seeds 20260819000–003: refused for H1-R; 004–009: AVAILABLE; 100–119: AVAILABLE.

### B.4 R3 compatibility of the pilot (FACT)
- Pilot slots 256–265, 320–329, 384–393, 448–457 and 512–521 lie inside the verified domain, with block code 0 and index < 32.
- R3c proves all 1,920 domain segments disjoint and free of contact with every domain seed's cognitive, visual and σ streams.
- Verification runs used seed 20260819000 only.
- `envSegmentDisjointFromConfig` cannot fail for a pilot configuration (B.1: 0 contacts).

## Appendix C — Corrections to earlier records
- `experiments/h1r/evidence_r3/R3_REPORT.md` §4 UNRESOLVED 2: the sentence "INFERENCE: the per-run probability is about 1 × 10⁻⁶" is withdrawn and replaced by the B.1 wording.
- The pre-freeze working documents (the draft, the freeze-package proposal and its audit) are superseded by this file and are not part of the record.
````

---

## Appendix B — M7 pre-registration v1.0, inherited clauses (§7–§9, §11–§12, §15–§16, verbatim)

Source: `research/cognitive-audit/M7_PREREGISTRATION.md` (blob `1ac709eec842d93869f6eb2e9ad9a22905b78f10`), SHA-256 `2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9`. H1-R v1.0 inherits every M7 clause it does not explicitly supersede (v1.0 header; supersessions in v1.0 Appendix A).

````markdown
## 7. Analysis windows

| Window | Ticks | Role |
|---|---|---|
| **W1 early** | 0–299 | **PRIMARY.** Fast-belief advantage: Beta converges in O(5–10) samples/edge; Q does not |
| **W2 mid** | 300–1499 | Descriptive. Convergence behaviour |
| **W3 post-shift** | 1500–1799 | **PRIMARY.** Re-adaptation speed — the strongest A-vs-B discriminator |
| **W4 late** | 1800–2999 | Descriptive. Asymptote — **a null here is predicted by H1 and is not evidence against it** |

**Only W1 and W3 are confirmatory.** W2 and W4 are descriptive, reported with CIs and **no p-values**.

---

## 8. Metrics (exact definitions)

One metric family per causal link. A run-level improvement with link ② or ③ absent is **not** a positive result.

### 8.1 Link ① — belief updates exist

- `n_updates` (count of trust updates)
- fraction of traversed edges with ≥ 3 observations
- Shannon entropy of the `trust` value distribution

**Pass:** non-degenerate. Failure here means broken wiring, not a false hypothesis.

### 8.2 Link ② — belief is informative (calibration)

- **Primary:** Spearman `ρ(trust_e, p_e)` over edges with **≥ 5 attempts**, computed at end of Phase I (tick 1499) and end of Phase II (tick 2999), against a permutation null (§11.5)
- **Secondary:** Brier score of `trust_e` predicting the next traversal outcome, vs. a global-base-rate predictor
- **Diagnostic:** calibration curve, 10 equal-width bins
- **Anti-memorization:** partial correlation of `trust_e` with `p_e` **controlling for visit count** — separates "belief tracks the world" from "belief tracks where the agent went"

### 8.3 Link ③ — decisions change (argmax flip rate)

Paired, per-decision, identical state and identical RNG stream position:

```
flip_rate = |{ticks : argmax(A1 candidates) != argmax(A2 candidates)}| / |eligible ticks|
```

- **Eligible ticks** = all ticks **minus** stale-execution ticks (§9)
- Reported **filtered and unfiltered**, always both
- **Monotonicity diagnostic (DESCRIPTIVE — no p-value, no falsification threshold):** flip rate binned by `max_e |trust_e − 0.5|` into 5 equal-width bins, reported as a Spearman ρ between bin index and flip rate with a 99% CI. Monotone increasing is predicted under H1 and flat under H-E, but **no confirmatory claim rests on it** and it is not a member of the primary family

### 8.4 Link ④ — changed decisions improve outcomes (conditional advantage)

**The metric that isolates causal contribution; a run-level comparison cannot provide it.**

Restricted to **flipped** decisions. For each, compare realised return over the next **k = 20 ticks**, A1 vs A2, from the identical state:

```
conditional_advantage = mean over flipped decisions of [ return_A1(t..t+20) - return_A2(t..t+20) ]
```

Reported with a bootstrap CI **clustered by configuration** (§11.4).

**Also:** **slip rate on chosen edges**, A1 vs A2 — the most direct behavioural read-out. If belief works, the belief agent traverses more reliable edges. **If this is flat, no score difference should be believed.**

### 8.5 Link ⑤ — run-level outcome

- **PRIMARY METRIC:** **mean return per 100 ticks**, computed per window as `(sum of rewardSignal over window) / (window ticks / 100)`
- Secondary: goal-reach rate; median steps-to-goal; **post-shift recovery half-life**, defined exactly as: the number of ticks after 1500 until the trailing 100-tick mean return first reaches 50% of that run's W2 mean return. **Degenerate cases pinned:** if the trailing mean never falls below that 50% threshold after the shift, half-life = **0**; if it never reaches the threshold before tick 2999, half-life is **right-censored at 1500** and the censored value is used in the paired comparison, with the censoring count reported per arm
- Anti-memorization: trajectory entropy; held-out vs. pilot configuration performance

**Stale-execution steps are NOT excluded from link-⑤ metrics.** Return is a property of the realised trajectory; removing ticks from it would distort the quantity itself. Exclusion applies **only** to links ③ and ④, where the argmax→execution correspondence is what is being measured.

---

## 9. Inclusion and exclusion rules

### 9.1 The F2b distinction — two flags, not one

These are **different quantities** and were conflated in revision 1 of the specification:

| Flag | Definition | Measured rate |
|---|---|---|
| `replayBranch` | The tick took the `liveRng() < 0.92` **else**-branch (`replayOneEpisode`) | **~8%** of steps |
| `staleExecution` | The action **executed** differs from the action **selected** on that tick | **4.5%** (17/380, `verify_S3.js` S3.2) |

`staleExecution ⊆ replayBranch` but they are **not equal**. Gate G8 asserts both fire correctly **and asserts that they differ** — asserting them equal would re-introduce the conflation.

### 9.2 Exclusion rule (pre-registered, binding)

> **Ticks where `staleExecution === true` are excluded from the link-③ and link-④ analysis sets, and only from those.**

Rationale: on those ticks the scorer's argmax has no causal relation to the executed action, so they inject pure attribution noise into the one measurement that establishes causality.

### 9.3 Mandatory dual reporting (Ruling Q3 — binding)

**Every table reporting a link-③ or link-④ result must carry:**

1. the **count and percentage** of ticks excluded as stale executions;
2. the **same statistic computed on the unfiltered set**;
3. the **direction and magnitude** of the difference between filtered and unfiltered.

> **Exclusion-validity rule.** If filtered and unfiltered results **disagree in sign** or **disagree in falsification verdict**, the exclusion is declared **NOT VALIDATED**. That disagreement is reported as a **primary finding**, and it triggers the Ruling Q3 clause under which repairing F2b may be reconsidered. It is **not** resolved by preferring whichever result is more favourable.

### 9.4 Run-level inclusion

| Situation | Rule |
|---|---|
| Run completes 3000 ticks | Included |
| Run crashes | **The entire (config, seed) pair is dropped from ALL SEVEN arms**, preserving pairing. Count, config, seed, arm and error reported. Never silently dropped |
| Agent never reaches goal in a run | **Included.** That is signal, not failure |
| Configuration rejected by R1–R5 | Discarded at generation, redrawn from the next config seed. Discard count logged |
| Gate failure (any of G1–G16) | **The study halts.** No data from a build with a failing gate enters any analysis |

### 9.5 No other exclusions

**No exclusion may be introduced after freeze.** Any additional exclusion applied post-freeze is a protocol deviation, must be reported as such, and results computed under it are exploratory.

---

````

````markdown
## 11. Statistical analysis (fully specified, no post-hoc choices)

### 11.1 Primary confirmatory family — **six hypotheses**

Revision 1 of the specification named the three arm comparisons as the correction family while separately specifying the primary test on **two** windows — leaving the total count of primary hypotheses ambiguous (3 comparisons × 2 windows = 6 tests). **Resolved before freeze, in the conservative direction, and confirmed by Director ruling 2026-08-19:**

> **The primary confirmatory family is SIX hypotheses:** {A1vA2, A1vA5, A1vA6} × {W1, W3}.

| # | Comparison | Window |
|---|---|---|
| 1 | A1 vs A2 | W1 |
| 2 | A1 vs A2 | W3 |
| 3 | A1 vs A5 | W1 |
| 4 | A1 vs A5 | W3 |
| 5 | A1 vs A6 | W1 |
| 6 | A1 vs A6 | W3 |

Every other comparison, window, arm and metric is **descriptive**: reported with CIs, **no p-values**, supporting no confirmatory claim.

### 11.2 Test and correction

| | |
|---|---|
| **Test** | Wilcoxon signed-rank on paired differences, paired by (config, seed) |
| **Tie handling** | **Pratt method** (zero differences retained in ranking, dropped from the statistic). Fixed here to remove a real analyst degree of freedom |
| **Sidedness** | **Two-sided.** H1 is directional but a significant reversal must be detectable, not silently discarded |
| **α** | **0.01** |
| **Correction** | **Holm–Bonferroni across all six** members of the primary family |
| **Significance criterion** | A hypothesis is confirmed iff its Holm-adjusted p < 0.01 **and** the effect is in the direction predicted by H1 |

### 11.3 Effect size

- **Matched-pairs rank-biserial correlation** for each primary comparison
- **Headline measure — fraction of oracle-attainable gain:** `(A1 − A2) / (A7 − A2)`, with a bootstrap CI over configurations

> **Degenerate-denominator rule (pinned in advance):** if the `(A7 − A2)` CI includes zero, the fraction is **not reported as a point estimate**. F-11 (§12) is evaluated first and, if it fires, the study is void — so this rule applies only to the borderline case, where the raw paired difference is reported instead and the fraction is reported as "undefined (oracle gain not distinguishable from zero)".

### 11.4 Bootstrap procedure

| | |
|---|---|
| Resamples | **10 000** |
| Method | **BCa** (bias-corrected and accelerated) |
| **Clustering** | **By configuration.** The resampling unit is the configuration, not the individual decision or run — decisions within a run are not independent, and treating ~3000 correlated decisions as independent would massively inflate significance |
| Seed | **770002**, fixed |
| CI level | **99%** (matching α = 0.01) |

### 11.5 Calibration null

Spearman `ρ(trust_e, p_e)` tested against a **permutation null**: **10 000** random shuffles of `p_e` across edges, seed **770003**. Reported with the permutation p-value and the null distribution's 99th percentile.

### 11.6 Reporting requirements

- Every arm, every window, every seed reported — including failures, crashes and exclusions with counts and reasons
- CIs privileged over p-values throughout
- **No metric may be introduced after unblinding without being labelled exploratory**
- Dual filtered/unfiltered reporting per §9.3 on every link-③ and link-④ table

---

## 12. Two-stage protocol and the deterministic sample-size procedure

### 12.1 Stage 1 — Pilot (~175 runs)

**5 pilot configs (`900000–900004`) × 5 pilot agent seeds (`20260819000–004`) × 7 arms = 175 runs.**

Purposes, in order:

1. **Verify all gates** — **G1–G6 and G8–G15** (G7 is superseded by G16), plus **G16 green as a precondition for Stage 1 running at all**;
2. **Evaluate F-11 FIRST** — if A7 ≈ A2 **per the §15.0 definition and its bounded single-extension procedure**, the environment does not reward reliability knowledge, the experiment is **void**, and Stage 2 **does not run**;
3. **Establish measurable variance** in the primary metric;
4. **Estimate variance and effect characteristics** per window;
5. **Execute the §12.3 power procedure** to determine the Stage-2 sample size.

> **Stage 1 may not be reported as evidence for or against H1.** Its only outputs are: gate verdicts, the F-11 verdict, variance estimates, and one integer (`n_seeds`).

### 12.2 What Stage 1 may and may not change

| May be finalised on pilot data | May NOT be changed by pilot data |
|---|---|
| Stage-2 `n_seeds` (via §12.3 only) | Arms; windows; primary metric; α; family membership; exclusion rules; falsification thresholds; environment parameters; the rectification form |

### 12.3 Power procedure — deterministic, executable, no discretion

Executed once, after Stage 1, exactly as follows:

**Step 1.** For each primary window `W ∈ {W1, W3}`, compute the 25 paired differences `d_i = returnA1_i − returnA2_i` over Stage-1 (config, seed) pairs.

**Step 2.** For each candidate `n_pairs` on the grid

```
n_pairs ∈ {30, 60, 90, 120, ..., 570, 600}      (multiples of 30)
```

run a **bootstrap power simulation**, seed **770001**, `B = 10 000` iterations:

- draw `n_pairs` values with replacement from the empirical distribution of `d`;
- apply the Wilcoxon signed-rank test (Pratt ties, two-sided);
- reject if `p < 0.01 / 6` — the **most conservative Holm position**, so the estimate cannot be optimistic;
- power = fraction of the `B` iterations rejecting.

**Step 3.** `n_pairs*` = the **smallest** grid value achieving **power ≥ 0.80 in BOTH W1 and W3** (the harder window governs). **If no grid value achieves this, `n_pairs* = 600`** and the cap rule §12.4 applies.

**Step 4.** Convert to the run plan:

```
n_configs = 30                       (fixed: the held-out block contains exactly 30)
n_seeds   = n_pairs* / 30            (integer by grid construction; 1..20)
total_runs = 30 * n_seeds * 7
```

Confirmatory agent seeds are the **first `n_seeds`** of `20260819100–20260819119`, in ascending order.

**Step 5 — cap.** The grid maximum is `n_pairs = 600`, i.e. **30 configs × 20 seeds × 7 arms = 4200 runs**, exactly the hard cap.

### 12.4 The cap rule (binding)

> **Hard maximum: 4200 confirmatory runs.**
>
> If the §12.3 procedure does **not** reach power ≥ 0.80 at `n_pairs = 600`, the study **runs at the cap** and is **reported as under-powered**, stating the achieved power at 600 for each primary window.
>
> **The cap is NEVER met by dropping arms, removing windows, widening α, changing the primary metric, or altering the design in any way.** Under-powered and honestly reported is the required outcome; a redesigned study that fits the budget is not.

### 12.5 Stage 2 — Confirmatory

Held-out configurations `900500–900529`; `n_seeds` from §12.3; all seven arms; every gate re-verified before the first run.

---

````

````markdown
## 15. Falsification criteria (pre-registered thresholds, not negotiable after freeze)

**F-11 is evaluated FIRST, on Stage-1 data, before any A1-vs-A2 comparison is examined.**

### 15.0 Definition of the equivalence operator "≈" (pinned)

The criteria below use "≈". Left undefined it would be a post-hoc lever, so it is defined here:

> **"X ≈ Y" means: the 99% BCa CI of the paired difference (X − Y) on the primary metric (§8.5), computed per §11.4 clustered by configuration, CONTAINS ZERO in BOTH W1 and W3.**

**Known property, stated rather than hidden:** equivalence-by-CI-inclusion is weak evidence at small n — an under-powered comparison always contains zero. This is why F-11 carries the bounded extension rule below, and why F-8/F-9 (sanity floors) are evaluated at the full Stage-2 n where the CI is informative.

**F-11 evaluation procedure (deterministic, bounded):**

1. Compute the 99% CI of (A7 − A2) in W1 and in W3 on Stage-1 data.
2. If the CI **excludes zero in at least one** window ⇒ **F-11 does not fire**; proceed to §12.3.
3. If the CI **contains zero in both** ⇒ take the **single pre-registered pilot extension**: 5 additional configs (`900005–900009`) × 5 additional seeds (`20260819005–009`) × 7 arms = 175 further runs. **This extension may be taken at most ONCE.** Extension runs are pilot data and do **not** count against the 4200 confirmatory cap.
4. Re-evaluate on the pooled 50-pair pilot. If the CI **still contains zero in both** windows ⇒ **F-11 FIRES. Experiment void. Stage 2 does not run.**

| | Criterion | Threshold | Kills |
|---|---|---|---|
| **F-11** | **Environment degenerate** | A7 ≈ A2 per **§15.0**, including its bounded single-extension procedure | **Experiment VOID** — not the hypothesis. Redesign §3. Stage 2 does not run |
| **F-1** | Belief does not track the hidden variable | Spearman ρ(trust, p) < 0.30, or CI includes 0, at end of Phase I | Link ② — **fatal to H1** |
| **F-2** | Belief does not change decisions | argmax flip rate < 1% of eligible decisions | Link ③ — **fatal to H1** |
| **F-3** | Changed decisions do not help | Conditional-advantage CI includes 0 | Link ④ — **fatal to H1** |
| **F-4** | No run-level benefit | (A1 − A2) CI includes 0 in **both** W1 and W3 at the §12.3-determined n | Link ⑤ |
| **F-5** | Gain is not informational | (A1 − A6) CI includes 0 | **C5 — fatal to H1-strict** |
| **F-6** | Gain is not per-edge | (A1 − A5) CI includes 0 | H1-strict; reduces to a global-arousal effect |
| **F-7** | Ordinary RL explains it | 99% CI of the paired difference (A2 half-life − A1 half-life), clustered by configuration, **includes zero or lies below zero** | **H-B wins** |
| **F-8** | Static heuristics explain it | A4 ≈ A1 per §15.0, evaluated at full Stage-2 n | H-C wins |
| **F-9** | Random explains it | A3 ≈ A1 per §15.0, evaluated at full Stage-2 n | H-E wins |
| **F-10** | Memorization | A1 held-out performance < 60% of pilot-config performance | H-D wins |

---

## 16. Abandonment criteria

**Abandon the design and redesign the environment if:**

- **F-11 fires** — a perfectly informed agent gains nothing, so nothing downstream means anything;
- **G11 or G13 cannot be satisfied by any configuration** — the 20-node graph cannot support a hidden variable that is both non-leaky and decision-relevant. **The graph, not the agent, is the limit.**

**Abandon the belief direction — and report that as the Phase 1.0 result — if:**

- **F-1 fires** and diagnosis shows `trust_e` tracks visit counts rather than `p_e` even after the §6.1 re-keying;
- **F-2 fires** under the symmetric form — with a genuinely calibrated belief and a ±12/unit term, a flip rate below 1% means belief is structurally dominated by Q. **Raising the weight to force flips is tuning-to-win and is forbidden**;
- **F-5 fires** — SHUFFLED matches BELIEF, so any gain was exploration perturbation. The cleanest possible refutation.

**Abandon the claim while continuing the work if:**

- **F-7 fires** — report honestly: *"the environment is learnable, and model-free RL learns it as well as the belief mechanism does."*

**Do NOT abandon merely because:**

- W4 shows no difference — **H1 predicts this**;
- the effect is small — a small, calibrated, replicated, oracle-bounded effect is a result; a large unbounded one would be more suspicious;
- the result is negative — a negative M7 is as informative as a positive one, and more likely.

### 16.1 Escalation rule

If **three or more** of F-1…F-10 fire, **do not iterate on M7.** Return to the Director with the position that one-step transition belief is the wrong minimal mechanism for this architecture, and that the **D2 planning repair** — or hidden *reward* rather than hidden *dynamics* — is the better next candidate.

### 16.2 The D2-shaped failure, named in advance

> **F-1 passes, F-2 passes, F-3 fails** — belief is calibrated, it does change decisions, and the changed decisions do not improve outcomes.

With no look-ahead, the agent can decline one unreliable hop but cannot route around an unreliable *region*, so a locally better choice can still lead somewhere worse. **If this pattern appears, the correct recommendation is "repair D2 and re-run M7 unchanged" — not to add a mechanism or reweight a term.** Named here so it cannot be re-read afterwards as evidence against the belief hypothesis.

---

````

---

## Appendix C — decision-log entries D-021 and D-020 (verbatim)

Source: `research/09_decisions.md` at source commit `30e7693236309bbfb82b8117b74240fc8ab5d43a` (blob `d0eefaa2e731e17f068723029330cbdd9469360a`). D-020's line numbers refer to the instrument at R3; the pins bind to the quoted code.

````markdown
## D-021 — H1R-P1: independent-falsification checkpoints (Gemini)

**Date:** 2026-10-04 · **Authority:** Director ruling "H1-R S6 / I1 / P1 FREEZE — DOCS ONLY" (2026-10-04), accepting the read-only H1R-S6 decision audit · **Status:** in force
**Scope:** a process requirement for H1-R. No hypothesis, metric, window, exclusion, arm, reward, topology, RNG, or verdict rule changes.

### 1. Decision
Gemini, the programme's independent adversarial reviewer (relayed by the user), performs three independent-falsification checkpoints:
- **(a) Red-team of H1R-S6 before the measurement commit.** Gemini receives the H1R-S6 template, the G16′ definition and the N1–N7 outputs (D-019). It attempts to construct a probe that changes behaviour yet passes the gates. Any successful counterexample strengthens the gates before the measurement commit.
- **(b) An independent §12–§14 implementation before Stage 1.** Gemini implements the §12 test, Holm, the 99% CI, the §13 power procedure and the §14 verdict from the H1-R v1.0 text alone, without seeing `analyze.js`. Both implementations run on a pre-registered synthetic fixture set and must agree exactly on every decision and within 10⁻⁹ on every real-valued output.
- **(c) Blind replication of the F-11 decision and of the final verdict.** Gemini computes each from the frozen run records independently, and both results are lodged before comparison.

### 2. Disagreement rule
Any disagreement halts the study until the cause is found and corrected, and is reported. It is never settled by choosing one result.

---

````

````markdown
## D-020 — H1R-I1: implementation pins for H1-R v1.0

**Date:** 2026-10-04 · **Authority:** Director ruling "H1-R S6 / I1 / P1 FREEZE — DOCS ONLY" (2026-10-04) · **Status:** in force
**Scope:** implementation interpretations of [H1-R v1.0](preregistrations/H1R_PREREGISTRATION_v1.0.md), fixed before any Stage-1 data.
- No hypothesis, metric, window, exclusion, arm, reward, topology, RNG, or verdict rule changes.
- The v1.0 bytes are unchanged (SHA-256 `c52e73378ad7759fe4e2829e972d1a97b5297da49b327b3c700c654a218ca836`).

Line numbers refer to the tree conformed by transform `cf30e20a71d59a67ba6163c55b94399d5d74f3b4609c6e3ea37e27080d5bfd5a`. The pins bind to the quoted code, not to the line numbers.

### 1. Pins
1. **argmax₁** = `bestChoice`: the first element of `choices.sort((a, b) => b.weight - a.weight)` (`const sorted = …` at main.js:2362; `const bestChoice = sorted[0];` at main.js:2367), at step 0, over the candidate-loop entries only. Graph-neighbour candidates appended afterwards are not part of it. **argmax₀** = the earliest-inserted candidate with the maximal shadow weight (the same stable sort applied to the shadow weights, in the same insertion order).
2. **Trust snapshot.**
   - Taken at the first statement of `runAgentLoop` (main.js:5069), at the entry where the measurement counter shows **1,505 completed `runAgent()` calls** (call indices 0–1504: the 5 calls before tick 0, plus τ 0–1499).
   - At that point `env.setTick(1500)` has already run (it does not touch the trust store) and none of loop 300's pre-work has run (that pre-work includes `decayTrust`).
   - The final snapshot is taken immediately after `runOnce` returns, with 3,005 calls completed.
3. **`measurementClean`** is true iff every measurement record is clean:
   - reward record: multi, orphan and non-finite counts all 0;
   - per-tick records: exactly `calls` entries, flags mutually exclusive;
   - per-attempt records: count equal to `envDraws`, all values finite;
   - reset events: equal to the runtime counters;
   - score/shadow records: one per step-0 candidate, all finite, with recomputed argmax₁ equal to `bestChoice`;
   - both trust snapshots present and finite;
   - floor counter finite and ≥ 0;
   - fork switch, if armed, applied exactly once at its call.

   The flag's scope is the v1.0 §9 measurement layer. This is not a new exclusion.
4. **Box–Muller** (v1.0 §13 power procedure):
   - **pairing:** one deviate per pair, z = √(−2 ln u₁)·cos(2πu₂), consuming u₁ then u₂; the sine partner is discarded;
   - **u₁ = 0:** u₁ is redrawn until it is non-zero, then u₂ is drawn;
   - **reset:** `makeRng(770001)` is re-initialised at the start of each (window, S). Iterations then draw a₁…a₃₀, b₁…b_S, and e row-major (c outer, s inner);
   - **loop order:** W1 then W3, S ascending.
5. **Fisher–Yates**, the B2 convention (`env.js` `shuffledIndices`, `arms.js` `makeSigma`): for i = n−1 down to 1, j = ⌊u·(i+1)⌋, swap a[i] and a[j].
6. **Permutation null** (descriptive):
   - K_τ is ordered by (from, to), ascending numerically;
   - the p-value is two-sided, (1 + #{|ρ*| ≥ |ρ|}) / 10,001.

---

````

---

## Appendix D — frozen agent facts the analysis depends on (B2 = 707cb1e, verbatim)

**D.1 `instrumentation/rng.js`** (blob `7d0c4ff70649c38f33ec284723f01ccc6a8630f2`): `makeRng` is the mulberry32 generator named by v1.0 §12/§13 and D-020.

````js
// ======================================
// M1 (The Spine)
// ======================================
// Deterministic, seedable pseudo-random source.
//
// WHY: the repo has 24 Math.random() sites and no seed control, so no
// two runs are comparable. This module gives cognition a reproducible
// random stream. Visual randomness (stars, neuronVisuals) stays on a
// SEPARATE stream so a variable number of render-frame draws can never
// desync the cognitive sequence — that separation is what makes the
// "same seed -> identical decisions" acceptance test robust.
//
// Pure ESM. No DOM. Node- and browser-safe.
// ======================================

// mulberry32: tiny, fast, well-distributed 32-bit PRNG.
export function makeRng(seed) {
    let a = (seed >>> 0) || 1;
    return function next() {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Named-stream registry. Cognition and visuals draw from different
// streams so they cannot perturb each other.
const streams = new Map();

export function initRng(seed) {
    streams.set("cognitive", makeRng(seed));
    streams.set("visual", makeRng((seed ^ 0x9e3779b9) >>> 0));

    // ── M7 environment stream (Director ruling R1, 2026-08-20) ────────
    // Frozen M7_PREREGISTRATION.md §3.7 requires environment draws to come
    // from liveRng("environment"); §5.1 pins its seed as agentSeed XOR 0x5EED.
    // Without registration liveRng() falls through to Math.random(), so
    // environment draws would be silently irreproducible and the paired
    // design would break invisibly.
    //
    // ADDITIVE ONLY: the "cognitive" and "visual" generators above are
    // constructed from identical seeds by identical code, so their draw
    // sequences are unchanged. Registration order does not affect draws.
    streams.set("environment", makeRng((seed ^ 0x5EED) >>> 0));

    return seed >>> 0;
}

export function rng(stream = "cognitive") {
    const s = streams.get(stream);
    if (!s) throw new Error(`rng stream "${stream}" not initialized — call initRng(seed) first`);
    return s();
}

// Convenience bound accessor for dependency injection into pure modules
// (e.g. scoring.calculateDecisionScore({ rng: cognitiveRng })).
export const cognitiveRng = () => rng("cognitive");
export const visualRng = () => rng("visual");

// ======================================
// LIVE-PATH ACCESSOR  (Phase 1.0 / Q3)
// --------------------------------------
// The application (main.js, render/*) draws through this instead of
// Math.random(). It exists because rng() deliberately THROWS when a
// stream is uninitialised - correct for the offline harness, fatal
// for the browser, where nobody calls initRng().
//
// CONTRACT - the whole point of Q3:
//   no seed set  ->  returns exactly Math.random()  (legacy behaviour,
//                    byte-for-byte; the app is unchanged unless seeded)
//   seed set     ->  returns the named deterministic stream
//
// rng() keeps its throwing contract untouched, so the existing
// exec_influence harness and its acceptance tests are unaffected.
//
// STREAM CHOICE. "cognitive" for anything that can influence a
// decision, a memory write, or the agent trajectory. "visual" for
// render-only draws, so a variable number of frame draws can never
// desync the cognitive sequence - the separation rng.js was built
// around in the first place.
// ======================================

export function isSeeded() {
    return streams.size > 0;
}

export function liveRng(stream = "cognitive") {
    const s = streams.get(stream);
    return s ? s() : Math.random();
}
````

**D.2 `render/executiveController.js`, lines 26–278** (blob `121441ce818d96684c7285b3e23d3d7058d01609`): the pure arbitration function `arbitrate` and its helpers. The module has no imports and no other top-level state.

````js
// ======================================
// SIGMOID NORMALIZATION
// maps any raw score to [0, 1] range
// sharpness controls transition steepness
// ======================================

function sigmoid(x, sharpness = 0.5) {

    return 1 / (1 + Math.exp(-x * sharpness));
}



// ======================================
// NORMALIZE COMPONENT
// converts raw component score to
// normalized [0, 1] pressure value
//
// center: score value at midpoint (0.5)
// scale:  how wide the range is
// ======================================

function normalizeComponent(

    value,
    center = 0,
    scale  = 5

) {

    return sigmoid((value - center) / scale);
}



// ======================================
// COMPETITIVE ARBITRATION
// winner-takes-MORE (not winner-takes-all)
//
// The highest-pressure signal gets
// disproportionate influence.
// Others contribute proportionally
// scaled by distance from leader.
//
// This prevents any single signal from
// completely dominating while still
// giving the leader real authority.
// ======================================

function competitiveArbitration(pressures) {

    const values = Object.values(pressures);
    const keys   = Object.keys(pressures);

    if (values.length === 0) return 0;
    if (values.length === 1) return values[0];


    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min;


    // ======================================
    // FLAT FIELD
    // all pressures nearly equal
    // use average (no clear winner)
    // ======================================

    if (range < 0.02) {

        return values.reduce((a, b) => a + b, 0) / values.length;
    }


    // ======================================
    // COMPETITIVE WEIGHTING
    // dominance score: 0 = weakest, 1 = strongest
    // non-linear scaling → winner amplified
    // ======================================

    let total    = 0;
    let totalW   = 0;

    values.forEach(v => {

        // normalized dominance [0, 1]
        const dominance = (v - min) / range;

        // non-linear amplification
        // pow(1.7) makes winner get more than proportional share
        const competitiveWeight = 0.3 + Math.pow(dominance, 1.7) * 0.7;

        total  += v * competitiveWeight;
        totalW += competitiveWeight;
    });


    return totalW > 0 ? total / totalW : 0;
}



// ======================================
// MAIN ARBITRATION FUNCTION
// called once per candidate evaluation
// returns final decision score
// ======================================

export function arbitrate({

    // ======================================
    // RAW COMPONENT SCORES
    // from runPrediction scoring logic
    // ======================================

    rewardScore,
    semanticScore,
    confidenceScore,
    uncertaintyScore,
    curiosityScore,
    costScore,

    // ======================================
    // EXECUTIVE WEIGHTS
    // from motivational state engine
    // ======================================

    executiveWeights,

    // ======================================
    // COGNITIVE DRIFT
    // small controlled noise
    // ======================================

    drift = 0,

    // ======================================
    // HARD BLOCKS
    // ======================================

    isSelfLoop = false,

}) {


    // ======================================
    // HARD BLOCK — SELF LOOP
    // ======================================

    if (isSelfLoop) return -1000;


    // ======================================
    // STEP 1: NORMALIZE EACH COMPONENT
    // convert raw scores to [0,1] pressure
    //
    // scale values tuned so typical
    // scores map to meaningful [0,1] range
    // ======================================

    const pressureReward =
        normalizeComponent(rewardScore, 0, 10);

    const pressureSemantic =
        normalizeComponent(semanticScore, 0, 4);

    const pressureConfidence =
        normalizeComponent(confidenceScore, 0, 6);

    const pressureUncertainty =
        normalizeComponent(uncertaintyScore, 0, 3);

    const pressureCuriosity =
        normalizeComponent(curiosityScore, 0, 2.5);

    // cost is SUPPRESSIVE — high cost = high suppression
    const pressureCost =
        normalizeComponent(costScore, 0, 6);


    // ======================================
    // STEP 2: APPLY EXECUTIVE WEIGHTS
    // motivation scales each pressure
    // ======================================

    const {
        wReward,
        wSemantic,
        wConfidence,
        wUncertainty,
        wCuriosity,
        wCost
    } = executiveWeights;

    const weightedPressures = {

        reward:      pressureReward      * wReward,
        semantic:    pressureSemantic    * wSemantic,
        confidence:  pressureConfidence  * wConfidence,
        uncertainty: pressureUncertainty * wUncertainty,
        curiosity:   pressureCuriosity   * wCuriosity,

    };


    // ======================================
    // STEP 3: COMPETITIVE ARBITRATION
    // dominant pressure leads
    // others contribute scaled
    // ======================================

    const rawScore =
        competitiveArbitration(weightedPressures);


    // ======================================
    // STEP 4: COST SUPPRESSION
    // fatigue / repetition suppress drives
    // applied after competition
    // ======================================

    const costSuppression =
        pressureCost * wCost * 0.6;


    // ======================================
    // STEP 5: GOAL URGENCY AMPLIFIER
    // (passed as part of rewardScore)
    // already factored in — no separate step
    // ======================================


    // ======================================
    // STEP 6: FINAL SCORE
    // competitive score − cost + drift
    // ======================================

    const finalScore =
        rawScore -
        costSuppression +
        drift;


    // ======================================
    // SCALE TO USABLE RANGE
    // multiply to get scores in
    // same ballpark as old system
    // so downstream logic still works
    // ======================================

    return finalScore * 12;
}
````

**D.3 `main.js` excerpts** (blob `113fa471f87f3c23bdfffa523ffe8d4d564f7172`; line numbers in the B2 file):

Lines 2053–2055:

````js
  const finalWeight =

  calculateDecisionScore({
````

Lines 2166–2169:

````js
      bayesianTrust: (globalThis.__M7_ARMS__
          ? globalThis.__M7_ARMS__.bayesianTrustFor(
                currentKey, k, getPathTrust(currentKey + "->" + k))
          : getPathTrust(currentKey + "->" + k)),
````

Lines 2237–2259:

````js
  const candidateArb = lastArbitrationBreakdown;
  let arbitratedScore = finalWeight;

  if (candidateArb && executiveWeights) {
      const competitiveScore = arbitrate({
          rewardScore:      candidateArb.rewardScore,
          semanticScore:    candidateArb.semanticScore,
          confidenceScore:  candidateArb.confidenceScore,
          uncertaintyScore: uncertaintyScoreValue,
          curiosityScore:   candidateArb.curiosityScore,
          costScore:        candidateArb.costScore,
          executiveWeights,
          drift:            0,
          isSelfLoop:       (k === currentKey),
      });
      // blend: 60% learned score + 40% competitive
      arbitratedScore = finalWeight * 0.60 + competitiveScore * 0.40;
  }

  choices.push({
    key: k,
    weight: arbitratedScore
  });
````

Lines 2360–2365:

````js
const sorted = choices.sort((a, b) => b.weight - a.weight);

// ================== 🧠 SAVE DECISION ==================

// best option (highest score)
const bestChoice = sorted[0];
````

Lines 2634–2639:

````js
if (step === 0) {
  window.lastReasoning = {
    from: currentKey,
    to: nextKey
  };
}
````

**D.4 `render/scoring.js` excerpts** (blob `5df3d72766addc5fe6e48589bc789542746b3428`, SHA-256 `4a13316698b52a2132d969c838d79f9d3ccc97a853bc5e3fa947fd43fac566d5`; `finalWeight` is the sum of the TERMS array, one of whose entries is the trust term):

Lines 183–184:

````js
    const trustBonus =
        (bayesianTrust - 0.5) * 8;
````

Lines 358–358:

````js
        ['trustBonus',              trustBonus * 1.5],
````

Lines 386–387:

````js
    let finalWeight = 0;
    for (let i = 0; i < TERMS.length; i++) finalWeight += TERMS[i][1];
````

Lines 408–412:

````js
        confidenceScore:
            transitionBoost * 3 +
            habitBoost * 2 +
            trustBonus * 1.5 +
            consolidationBonus * 2.0,
````

Lines 451–451:

````js
    return Math.max(-400, Math.min(400, finalWeight));
````

**D.5 `connections.json`** (blob `7180160561605df4153852b5aab16166ce08cde3`): the 39 undirected edges of the 20-node graph.

````json
[
  {"from":1,"to":2,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":1,"to":4,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":2,"to":3,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":3,"to":4,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":2,"to":5,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":3,"to":6,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":1,"to":6,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":5,"to":6,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":5,"to":8,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":6,"to":7,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":7,"to":8,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":8,"to":9,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":6,"to":10,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":7,"to":12,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":9,"to":10,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":10,"to":11,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":11,"to":12,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":9,"to":12,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":11,"to":13,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":10,"to":13,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":12,"to":15,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":13,"to":14,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":13,"to":16,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":14,"to":15,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":15,"to":16,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":14,"to":17,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":15,"to":17,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":16,"to":18,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":17,"to":18,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":17,"to":19,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":18,"to":20,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":19,"to":20,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":20,"to":1,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":19,"to":6,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":17,"to":8,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":4,"to":9,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":8,"to":13,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":12,"to":17,"confidence":1,"rewardHistory":0,"penaltyHistory":0},
  {"from":20,"to":5,"confidence":1,"rewardHistory":0,"penaltyHistory":0}
]
````

---

## Appendix E — the run-record format (accepted measurement instrument MS-1, commit 30e7693)

**E.1 `experiments/h1r/measure.mjs`** (blob `25b6463d4da372aff34bbe960f5ed863a3b53db1`), the measurement sink, whole file:

````js
// ==========================================================
// H1-R — MEASUREMENT LAYER (v1.0 §8, §9; D-019 as amended by D-022; D-020)
// ==========================================================
// This module is the measurement sink. It references no global, imports only Node built-ins, and returns
// nothing the agent uses. Binding the sink to `globalThis.__H1R_MEASURE__` is done by measure_install.mjs.
//
// N5′ (D-019 §5): `score` is the pinned function, byte-exact `score(f, t) { S.push(f, t); }`, and `S` is
// private to this module and read only by `record()`.
//
// Sink methods, all observational. The call index is `calls - 1` at the time of the call (M-STEP opens a call):
//   step()                         M-STEP      one runAgent() call
//   reward(v)                      M-REWARD    the final rewardSignal of the call
//   score(f, t)                    M-SCORE     pre-clamp finalWeight and the trust term, every scoring call
//   candidate(step, key, returned, w, applied, arb, unc, ew, selfLoop)
//                                  M-CANDIDATE one per candidate-loop entry, every step, in scoring order
//   best(step, key)                M-BEST      bestChoice of that step's weight sort
//   decision(key)                  M-DECISION  the step-0 selection write
//   replay()                       M-REPLAY    the replay (else) branch was taken
//   floor()                        M-FLOOR     the A5 aggregate floor raised confidenceState
//   attempt(from, to, ok, goalEntering, a, s)   from the H1R runtime at each environment draw; a and s are the
//                                  raw trust-store attempts and successes of the key just before the attempt
//   reset(kind)                    from the H1R runtime at an episode boundary ('goal' | 'cap')
//   snapshot(label, entries)       from the H1R runtime: [[key, a, s, rawPhaseAttempts], ...]
//   fork(call, arm)                from the H1R runtime when an armed fork switch is applied
// ==========================================================
import crypto from 'node:crypto';

export const MEASURE_SCHEMA = 'h1r.measure/2';

export function createMeasure() {
  const S = [];                                 // N5′: score sink storage, read only by record()
  let calls = 0;
  const events = [];                            // [call, rewardSignal]
  let multi = 0, orphan = 0, nonFinite = 0, lastReward = -1;
  const candidates = [];                        // [call, step, key, returned, w] + step 0: [applied, arb[5]|null, unc, ew[6]|null, selfLoop]
  const bests = [];                             // [call, step, key, candidate count at the sort]
  const decisions = [];                         // [call, key]
  const replays = [];                           // call
  const floors = [];                            // call
  const attempts = [];                          // [call, from, to, ok, goalEntering, a, s]
  const resets = [];                            // [call, kind]
  const snapshots = [];                         // [label, calls, entries]
  const forks = [];                             // [call, arm]
  const cur = () => calls - 1;
  const arbOf = (a) => a ? [a.rewardScore, a.semanticScore, a.confidenceScore, a.curiosityScore, a.costScore] : null;
  const ewOf = (e) => e ? [e.wReward, e.wSemantic, e.wConfidence, e.wUncertainty, e.wCuriosity, e.wCost] : null;
  const M = {
    step() { calls++; },
    reward(v) {
      const i = cur();
      if (i < 0) { orphan++; return; }
      if (i === lastReward) multi++;
      lastReward = i;
      const x = Number(v);
      if (!Number.isFinite(x)) nonFinite++;
      events.push([i, x]);
    },
    score(f, t) { S.push(f, t); },
    candidate(step, key, returned, w, applied, arb, unc, ew, selfLoop) {
      candidates.push(step === 0
        ? [cur(), step, key, returned, w, applied ? 1 : 0, arbOf(arb), unc, ewOf(ew), selfLoop ? 1 : 0]
        : [cur(), step, key, returned, w]);
    },
    best(step, key) { bests.push([cur(), step, key, candidates.length]); },
    decision(key) { decisions.push([cur(), key]); },
    replay() { replays.push(cur()); },
    floor() { floors.push(cur()); },
    attempt(from, to, ok, goalEntering, a, s) { attempts.push([cur(), from, to, ok ? 1 : 0, goalEntering ? 1 : 0, a, s]); },
    reset(kind) { resets.push([cur(), kind]); },
    snapshot(label, entries) { snapshots.push([label, calls, entries.map(e => e.slice())]); },
    fork(call, arm) { forks.push([call, arm]); },
    count() { return calls; },
    record() {
      return {
        schema: MEASURE_SCHEMA, calls, eventCount: events.length, multi, orphan, nonFinite,
        events: events.map(e => [e[0], e[1]]),
        score: S.slice(),
        candidates: candidates.map(c => c.map(x => Array.isArray(x) ? x.slice() : x)),
        bests: bests.map(b => b.slice()), decisions: decisions.map(d => d.slice()), replays: replays.slice(),
        floors: floors.slice(), attempts: attempts.map(a => a.slice()), resets: resets.map(r => r.slice()),
        snapshots: snapshots.map(s => [s[0], s[1], s[2].map(e => e.slice())]), forks: forks.map(f => f.slice()),
      };
    },
    // reward-record digest (unchanged semantics since R2; M5 compares it across driver and recorder)
    digest() { return crypto.createHash('sha256').update(JSON.stringify(events)).digest('hex'); },
  };
  return Object.freeze(M);
}
````

**E.2 The probe lines inserted into the agent** (from `experiments/h1r/conformance_transform.mjs`, blob `12aab08c952632ad1bcda2bbe7a30385976181b8`). Each is one statement placed as named: M-STEP at the start of every `runAgent()` call; M-REWARD before the first use of the call's final `rewardSignal`; M-SCORE immediately before `calculateDecisionScore`'s clamp-return; M-CANDIDATE after each candidate-loop `choices.push`; M-BEST after `const bestChoice = sorted[0];`; M-DECISION inside the step-0 selection write; M-REPLAY in the replay (else) branch; M-FLOOR where `updateBehavior`'s aggregate floor raises `confidenceState`.

````js
if (globalThis.__H1R_MEASURE__) globalThis.__H1R_MEASURE__.step(); // H1R M-STEP: measurement tick (observational)
if (globalThis.__H1R_MEASURE__) globalThis.__H1R_MEASURE__.reward(rewardSignal); // H1R M-REWARD: final rewardSignal of this tick (observational)
if (globalThis.__H1R_MEASURE__) globalThis.__H1R_MEASURE__.candidate(step, k, finalWeight, arbitratedScore, !!(candidateArb && executiveWeights), candidateArb, uncertaintyScoreValue, executiveWeights, k === currentKey); // H1R M-CANDIDATE (observational)
if (globalThis.__H1R_MEASURE__) globalThis.__H1R_MEASURE__.best(step, bestChoice ? bestChoice.key : null); // H1R M-BEST: argmax of this step
if (globalThis.__H1R_MEASURE__) globalThis.__H1R_MEASURE__.decision(nextKey); // H1R M-DECISION: step-0 selection write (observational)
if (globalThis.__H1R_MEASURE__) globalThis.__H1R_MEASURE__.replay(); // H1R M-REPLAY: replay branch taken (observational)
if (globalThis.__H1R_MEASURE__) globalThis.__H1R_MEASURE__.score(finalWeight, trustBonus * 1.5); // H1R M-SCORE
if (globalThis.__H1R_MEASURE__) globalThis.__H1R_MEASURE__.floor(); // H1R M-FLOOR: the aggregate floor raised confidenceState (observational)
````

**E.3 How `run_h1r.mjs` writes the record** (blob `02b145e50ba7b64e94b87decb8cbbe7b15b0984b`; lines 70–75 and 152–158):

````js
// per-tick records (v1.0 §9 item 1): one flag per call — D decision, R replay, N neither (no-commit); X both
const nDec = new Array(m.calls).fill(0), nRep = new Array(m.calls).fill(0);
let tickFaults = 0;
for (const [c] of m.decisions) if (c >= 0 && c < m.calls) nDec[c]++; else tickFaults++;
for (const c of m.replays) if (c >= 0 && c < m.calls) nRep[c]++; else tickFaults++;
const ticks = nDec.map((d, i) => (d > 1 || nRep[i] > 1) ? 'X' : d && nRep[i] ? 'X' : d ? 'D' : nRep[i] ? 'R' : 'N').join('');
````

````js
  measurement: IN.digestOnly
    ? { schema: MEASURE_SCHEMA, ...counts, digest: digests.reward, digests }
    : { schema: MEASURE_SCHEMA, ...counts, digests,
        events: m.events, ticks, attempts: m.attempts, resets: m.resets, snapshots: m.snapshots, floorCalls: m.floors,
        decisions: m.decisions,
        // step-0 candidate records, one group per step-0 weight sort: [call, bestChoice key,
        //   [[key, F (pre-clamp), t = trustBonus·1.5, returned, w, applied, arb[5], uncertainty, ew[6], selfLoop], ...]]
````

**E.4 Field table (facts about the instrument).**

| Field | Content |
|---|---|
| `calls` | number of `runAgent()` calls (3,005 in a full run) |
| `events` | `[callIndex, rewardSignal]`, one per call that computed a `rewardSignal` (realised moves and goal entries) |
| `ticks` | string of length `calls`; character i is `D` if M-DECISION fired in call i, `R` if M-REPLAY fired, `N` if neither (`X` would mean both; it never occurs in a valid record) |
| `attempts` | `[callIndex, from, to, ok, goalEntering, a, s]`, one per environment draw: the attempted directed edge, the outcome (1 = traversed), whether `to` is the goal, and the trust store's raw attempts `a` and successes `s` of key `from->to` immediately before the attempt |
| `resets` | `[callIndex, 'goal' \| 'cap']`, every episode reset |
| `snapshots` | `[label, callsCompleted, entries]`: `'tau1499'` taken at the `runAgentLoop` entry with 1,505 completed calls; `'tau2999'` after the run (3,005). Each entry is `[key, a, s, raw]`: the store's attempts and successes of the directed key, and the number of attempts of that key whose τ lies in the snapshot's phase (`[0, 1499]` resp. `[1500, 2999]`). Keys are the union of the store's keys and the keys attempted in the phase; entries are sorted by (from, to) numerically |
| `floorCalls` | call index of every M-FLOOR record |
| `decisions` | `[callIndex, executedKey]` per step-0 selection write |
| `step0` | one entry per step-0 weight sort: `[callIndex, bestChoiceKey, candidates]`, candidates in candidate-loop insertion order, each `[key, F, t, returned, w, applied, arb, unc, ew, selfLoop]`: F = pre-clamp `finalWeight` and t = `trustBonus * 1.5` (the M-SCORE pair of that candidate's scoring call); returned = the value `calculateDecisionScore` returned; w = the candidate's weight pushed to `choices`; applied = 1 iff `candidateArb && executiveWeights`; arb = `[rewardScore, semanticScore, confidenceScore, curiosityScore, costScore]` of `lastArbitrationBreakdown`; unc = `uncertaintyScoreValue`; ew = `[wReward, wSemantic, wConfidence, wUncertainty, wCuriosity, wCost]`; selfLoop = 1 iff `k === currentKey` |
| `forks` | `[call, arm]` when an armed fork switch was applied (fork runs only); fork mode switches an A1 run's E3 and E4 deliveries to A2's immediately before call `call` |

`step0` is assembled by the driver from the sink's records: score pair k (M-SCORE) belongs to candidate record k (M-CANDIDATE), because `calculateDecisionScore` has a single caller, inside the candidate loop, and nothing between that call and the push returns; the step-0 candidates of a sort are the candidate records between two M-BEST records. The assembling function is not part of this package; this table is the specification of the format. In the synthetic fixture M01 the values are synthetic but have this format.

---

## Appendix F — fixture schemas and excerpts

**F.1 Study fixtures `S01`–`S17` (schema `h1r.d021b.study/1`).**
- `pilot.configs`: 10 entries `{index, goal, block}`, block `'stage1'` (indices 0–4) or `'extension'` (5–9); `pilot.seeds`: the five pilot agent seeds; `pilot.extensionAvailable`: false iff the extension's configurations do not exist within the hard bound 889999.
- `pilot.cells` and `heldout.cells`: one row per (configuration, seed, arm) with the columns of `cellColumns`: `[configIndex, seed, armIndex (0 = A1 … 6 = A7), valid (0/1: 0 = some validity flag of that run was false), R_W1, R_W2, R_W3, R_W4, R_all, halfLife, halfLifeCensored (0/1), fingerprint, floorRaises]`.
- `heldout`: 30 configurations × 20 seeds (ascending) × 7 arms; `a1Links` one row per (configuration, seed): `[configIndex, seed, rho1499|null, rho2999|null, decisionTicks, replayTicks, flips, flipsByWindow[4], decisionTicksByWindow[4], replayTicksByWindow[4]]` (counts over τ ∈ [0, 2999]); `flipPopulations`: `[configIndex, seed, [[t, difference|null], …]]`, the A1 run's flipped decision ticks t ≤ 2980 in ascending t, with difference = [Σ r over τ ∈ [t, t+20) in A1] − [the same in the fork switched at call t + 5], or `null` when that fork crashed and its re-run crashed; `monotonicity`: `[configIndex, seed, decisionsPerBin[5], flipsPerBin[5]]`.

Excerpts of S01: pilot cells 0–2 [[0,20260819004,0,1,26.59333,24.642807,14.78093,22.197927,20.596418,280,0,"83a41d1f505b719e",193],[0,20260819004,1,1,19.521364,23.115065,9.233916,24.939698,21.706709,439,0,"340551533ada2adb",0],[0,20260819004,2,1,23.271656,24.393783,11.337459,22.447373,20.713453,376,0,"f6b01d7e6995b46b",161]]; held-out cells 0–1 [[0,20260819100,0,1,20.857526,26.091001,22.276492,25.555472,24.94962,227,0,"d8f384da89a81fa9",168],[0,20260819100,1,1,15.927932,30.950977,18.221899,27.01066,23.95679,457,0,"448dec10e6f7d1dc",0]]; a1Links 0 [0,20260819100,0.70006,0.467188,2759,241,40,[4,16,4,16],[269,1104,282,1104],[31,96,18,96]]; flipPopulations 0 (first 3) [0,20260819100,[[34,-1.725859],[84,3.188754],[106,-1.352899]]]; monotonicity 0 [0,20260819100,[988,675,541,328,227],[9,12,9,6,4]].

**F.2 Record fixture `M01` (schema `h1r.d021b.records/1`).** `graph` {nodes, edges}; `configurations`: `{index, goal, edges: [{from, to, pPhaseI, pPhaseII}]}` (p_e per undirected edge, symmetric); `runs`: `{runId, arm, configIndex, seed, measurement}` with the Appendix E record fields; `forkRuns`: `{forkId, baseRunId, fork: {call, to}, measurement: {calls, events, forks}}`.

Excerpts of run m1: events 0–2 [[0,0.3],[4,0.3],[6,0.3]]; attempts 0–1 [[0,12,17,1,0,0,0],[2,17,8,0,1,0,0]]; step0 group 0 [0,11,[[7,61.003004,0,61.003004,36.794761012842315,1,[3.607336,3.284405,-3.264458,0.674635,2.922863],1.16607,[0.221427,0.189393,0.193126,0.103616,0.087155,0.172429],0],[11,475.161474,0,400,400,0,[1.403231,-1.356478,2.275237,1.752846,1.185626],1.051016,[0.221427,0.189393,0.193126,0.103616,0.087155,0.172429],0],[9,-121.649929,0,-121.649929,-72.83514075989709,1,[-5.386069,0.789365,2.536511,0.586281,3.448491],0.062433,[0.221427,0.189393,0.193126,0.103616,0.087155,0.172429],0],[15,-5.738433,0,-5.738433,-3.2150713961123274,1,[9.738376,1.977868,-3.465761,0.551746,1.029423],1.674423,[0.221427,0.189393,0.193126,0.103616,0.087155,0.172429],0],[17,24.328085,0,24.328085,14.787553546363748,1,[6.026089,0.130828,-3.361992,0.144502,1.31091],0.074707,[0.221427,0.189393,0.193126,0.103616,0.087155,0.172429],0]]]; snapshot labels [["tau1499",1505,73],["tau2999",3005,75]]; configuration 0 edge 0 {"from":1,"to":2,"pPhaseI":0.931783,"pPhaseII":0.329999}; fork runs [["m1@705",{"call":705,"to":"A2"}],["m1@1505",{"call":1505,"to":"A2"}],["m1@2985",{"call":2985,"to":"A2"}]].

**F.3 Files.** `S01.json` SHA-256 `0c07f475e550c59ca06f752f22869f2ad5ecd12b01df094a160fe921e69a5f62`; `S02.json` SHA-256 `922a7e57d0d2be0ac7981c9ad16ff6833f9138994eb3a95bc871383916a9ce40`; `S03.json` SHA-256 `c521cd5c7b245e37172de8b1faaff5beeb15acf72d17039388777864332f11e7`; `S04.json` SHA-256 `682989ea5154e31b2c5001d2445211997df64e405d6b37fd716d7bdea406a366`; `S05.json` SHA-256 `c31aa0f6c3afe73e6d135e7f492672b001915fb7dc48766b0a08efd49945067c`; `S06.json` SHA-256 `c9547a229f74757c817a870a9b60a50dbaaf16813199b169aba491b33de549d8`; `S07.json` SHA-256 `4cbe04b712e76382dc11f96724bd4073d9d16e58af6db1a296f3fd599be71af5`; `S08.json` SHA-256 `1d35915b08151866773295aaa91afc5e26fb60f5ad044413ec69f6c8b7e4b3e0`; `S09.json` SHA-256 `d5e3878a555ea15309bbf943f427e08daaf8c945331a76782fd8cafc49822031`; `S10.json` SHA-256 `0b6c8721dd59eedcecc6bc51393875cd065f139c767482630fbd348b533cd131`; `S11.json` SHA-256 `ba58757457ad33fb5e9facf8eb39bb1531471ade21b64457d9e50f943ed4ab57`; `S12.json` SHA-256 `c8ce4037058ee800cfc93a4838a8ddf6e69abd9e6d42afa88f6f433204fcd097`; `S13.json` SHA-256 `c886724315549c0a1eda1d56a6cc6b6061cf81114c6c203c6712314217f3b238`; `S14.json` SHA-256 `c6be190723c013e25720b8eeb80b044541b3cd41e980b249b488e640ada3860d`; `S15.json` SHA-256 `9eee25049bd242a5cbc9214d79daa4d953b6dcdbb484b6b47fbf0b8803a35060`; `S16.json` SHA-256 `6dd31e1754013e8c465ccc2f03e55ee3df42c1168e0659d12fcb30fa7c045b1c`; `S17.json` SHA-256 `cada8a3f9a85071eb78f748037ea1c5112a23258d0d16a7e773920f010186f29`; `M01.json` SHA-256 `bdc8a9c1de9feead469e3a1ae16a1333455eedba950e9ef8b93dbb06dbd38175`.

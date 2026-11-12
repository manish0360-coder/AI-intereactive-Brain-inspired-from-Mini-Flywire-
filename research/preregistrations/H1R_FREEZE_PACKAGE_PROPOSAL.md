# H1-R preregistration freeze package: proposal

**Status:** a proposal for Research Director ruling. **Untracked and not committed.** Prepared 2026-10-04 by Claude (implementer).

**How it was made:** read-only. No code was changed, H1-R was not run, no outcome was generated, and no configuration was generated:
- the pilot block was assessed by seed arithmetic and an acceptance model only;
- the held-out stream was assessed by seed arithmetic only.

**Build under review:** `e8e904a` (R3) on B2 `707cb1e`.

**Read:**
- [`H1R_PREREGISTRATION_DRAFT.md`](H1R_PREREGISTRATION_DRAFT.md);
- the R1, R2 and R3 reports;
- [erratum R3](H1R_ERRATUM_R3_ENVIRONMENT_SEED.md) and M7 errata 07–09;
- frozen M7 §5, §7–§12, §15–§19;
- `experiments/h1r/README.md`, `run_h1r.mjs`, `measure.mjs`, `env_seed.mjs`;
- `experiments/m7/run.js`, `render/scoring.js`, `render/executiveController.js`, `render/behavior.js` (B2);
- `experiments/registry/typed.js` and its chain.

**Tags:**
- **FACT**: verifiable now, with the source cited;
- **INFERENCE**: reasoned, not measured;
- **RECOMMENDATION**: binds nothing until ruled.

---

## 0. Decision summary

| ID | Recommendation (one line) |
|---|---|
| **D-2** | Pilot = the first 5 accepted configurations of a sequential stream from `893000` (hard bound `894999`) × agent seeds `20260819004–008` × 7 arms (175 runs). The extension, if F-11 requires it, = the next 5 accepted configurations × the **same** 5 seeds (175 runs). Pooled: 10 × 5, fully crossed. |
| **D-3** | Treat configuration and agent seed as **two crossed random factors**. The (configuration, seed) cell is the observation, not the unit. Primary test: Clark's **min F′** on the cell array of paired differences, two-sided, α = 0.01, Holm over 6. The same variance model drives every CI on a paired difference, "≈", and F-11. The power procedure is re-specified to match (§2.6). |
| **D-4** | Pin every link metric exactly as in §3: the link ③ shadow argmax, the link ④ fork, the calibration unit (directed key), steps-to-goal (Kaplan–Meier with cap censoring), trajectory entropy, F-10 (whole run, ratio of means), and slip rate (non-goal-entering attempts). |
| **D-5** | The primary metric is measurable from the saved driver record now. Links ①–④, steps-to-goal, slip rate, entropy and A5 floor activity are **not**: they need the measurement-layer milestone (§4). |
| **D-6** | `tickUnit = 'step'`; τ = (0-based `runAgent()` call index) − 5; windows on τ ∈ [0, 2999]. |
| **D-7** | Any failed validity condition (now 11 flags, including R3's) is handled as a crash: the whole (configuration, seed) pair is dropped from all 7 arms and reported. The D-3 missing-cell rule then applies. |
| **D-8** | Ratify the blocking battery in §7, including the R2, R3 and measurement gates. R2b, P1, F2/G15′ as declared, and the classified historical failures are non-blocking. |
| **D-9** | Retain A5 unchanged. Report A5 ≡ A2 identity counts (computable now) and floor-binding activity (needs one counter). |
| **D-10** | **Waive** the exploratory 2×2 PE factorial explicitly (§9). |
| **D-11** | Record every H1-R ruling in `research/09_decisions.md`. Commit the three untracked M7 documents with `-text`, at the SHA-256 values in §10. |

---

## 1. D-2: pilot material and seeds

### FACT
1. **Registry** (`experiments/registry/typed.js`, read-only queries, 2026-10-04):
   - config seeds `893000–894999`: not held out, not consumed;
   - `895000–900499`: consumed;
   - `900500` onward: held out.
2. **Trajectory seeds for H1-R pilot use:**
   - `20260819000`: refused, CONSUMED_BY_OTHER_STUDY (M7-substrate, category REGISTERED);
   - `001–003`: refused (M31, category DEVELOPMENT). An authorisation could not convert them, because the registry refuses a CATEGORY_TRANSITION from development or registered to pilot;
   - `004–009`, `010` and `100–119`: AVAILABLE.
3. **R3's verified domain** is agent seeds `000–009` and `100–119`; any other seed is refused (`env_seed.mjs`). The frozen rule makes confirmatory seeds (`100–119`) disjoint from pilot seeds.
   **So exactly six seeds are usable for the H1-R pilot: `004–009`.** The frozen pilot plus extension needs 10 distinct seeds (frozen §15.0 step 3), which is impossible without either (a) extending the R3 domain (new verification plus a ruling) or (b) re-categorising registry records (refused by design).
4. **The frozen pilot configurations are unusable.**
   - `900000–900004` resolve to 3 distinct `p_e` vectors, one of them in the ERR-09 diagnostic range (draft §9.2).
   - They are consumed in the registry.
5. **Configuration-generator contacts at pilot positions: none.** Exact enumeration, under the reserve rule (generator 1,024 draws, environment segment 4,096): for seeds `004–009` × pilot block × index 0–9, **no** candidate seed in `893000–894999` has a generator segment sharing a state with the position's environment segment. The per-run validity condition `envSegmentDisjointFromConfig` therefore **cannot** fire in the pilot (§11).

### INFERENCE
- The acceptance model is geometric, with per-goal acceptance rates from the 41 ERR-09 samples (7, 11, 14, 9 of 470 seeds).
- On that model, the 10th accepted configuration of a stream from 893000 lies at offset 500 ± 162.
- P(the 10th accepted configuration ≤ 894999) = 0.99999997.

### RECOMMENDATION (smallest valid frozen pilot)

| Item | Pinned value |
|---|---|
| Pilot configurations | `generateAcceptedStream(893000, 5)`: accepted indices 0–4, goals 8, 12, 16, 19, 8 (`GOALS[i mod 4]`), with ERR-07 provenance. **Hard bound 894999**, asserted mechanically; reaching it refuses the run plan and returns to the Director (no silent continuation). |
| Pilot agent seeds | `20260819004–008` |
| R3 positions | (seed, `pilot`, index i), i = 0–4. Inside the verified domain. |
| Runs | 5 × 5 × 7 = 175 |
| F-11 extension (at most once, frozen §15.0) | Accepted indices 5–9 of the **same** stream × the **same** seeds `004–008` = 175 runs. Pooled: 10 configurations × 5 seeds = 50 pairs, fully crossed. |
| Reserve | `20260819009` is not used without a ruling |
| Registry (code/data change, §12) | Register `893000–894999` as the H1-R pilot block, plus trajectory records (H1-R, pilot) for `004–008`, before the first pilot run |

**Deviation from frozen §15.0 step 3, stated:** the extension adds configurations but not seeds. It still yields the frozen 50 pairs. Under D-3 a fully crossed 10 × 5 array is the better design: it identifies the configuration, seed and residual variance components that the power procedure needs.

---

## 2. D-3: the crossed configuration × seed analysis

### 2.1 FACT: what is shared, and by whom
- **Within a configuration** (all seeds and arms): topology, goal, the `p_e` vector (both phases), and the unreliable set.
- **Within an agent seed** (all configurations and arms):
  - the cognitive stream;
  - the agent's boot embeddings. These are identical across configurations, as measured in the R3 investigation;
  - σ (A6).

  The reward for a non-goal move is a threshold function of the cosine similarity of the **agent's** embeddings (+2 / +0.3 / −0.4; draft §6.4). **The non-goal reward landscape is therefore a property of the seed, shared by every configuration that seed is run on.**
- **Within a cell** (all 7 arms): the environment stream (R3). It is disjoint across cells (R3a–R3c).
- **The design is fully crossed:** every confirmatory seed is run on every held-out configuration (frozen §5.2, §12.3).

### 2.2 The correct statistical unit
There is **no single independent unit**:
- **The cell** (frozen Wilcoxon, n = 30·S) is pseudoreplicated. Cells that share a configuration share α_c; cells that share a seed share β_s.
- **The configuration mean** (draft v0.1 recommendation, n = 30) removes the configuration dependence. But every configuration mean contains the **same** seed sample, so its standard error omits the seed component. The resulting inference is conditional on the S seeds used.
- **The seed mean** omits the configuration component.

The observation is the **cell**. The sampling units are **configurations and seeds, as two crossed random factors**.

Model for a paired difference (comparison k, window W), with configurations c = 1…C and seeds s = 1…S:

```
d_cs = μ + α_c + β_s + ε_cs        α ~ (0, σ_c²),  β ~ (0, σ_s²),  ε ~ (0, σ_e²)
Var(d̄) = σ_c²/C + σ_s²/S + σ_e²/(C·S)
```

The estimand μ is the mean A1-minus-comparator difference over the population of accepted configurations **and** agent seeds. That is the population a claim about MiniFlyWire on this environment family refers to.

### 2.3 Primary test (RECOMMENDATION; replaces frozen §11.2's Wilcoxon over cells)
For a complete C × S array of cell differences:

```
d̄_c· = (1/S) Σ_s d_cs        d̄_·s = (1/C) Σ_c d_cs        d̄ = (1/CS) Σ d_cs
MS_C = S · Σ_c (d̄_c· − d̄)² / (C − 1)
MS_S = C · Σ_s (d̄_·s − d̄)² / (S − 1)
t′   = d̄ / sqrt( (MS_C + MS_S) / (C·S) )                     (min F′ = t′²; Clark 1973)
ν    = (MS_C + MS_S)² / ( MS_C²/(C − 1) + MS_S²/(S − 1) )      (Satterthwaite)
p    = 2 · P(T_ν > |t′|)
```

- **Validity.** E[(MS_C + MS_S)/(CS)] = σ_c²/C + σ_s²/S + 2σ_e²/(CS), never less than Var(d̄). The test is therefore conservative by σ_e²/(CS), uses no negative variance estimate, needs no iterative fit, and is deterministic (no seed).
- **Significance, sidedness, correction and confirmation rule:** unchanged. α = 0.01, two-sided, Holm across the six members. Confirmed iff the Holm-adjusted p < 0.01 **and** sign(d̄) is as H1 predicts.
- **The CI that matches the test:** `d̄ ± t_{ν, 1−α/2} · sqrt((MS_C + MS_S)/(CS))`. At 99% this is the CI for:
  - the "≈" operator (§15.0);
  - F-4, F-5, F-6, F-7 (on half-lives), F-8, F-9;
  - F-11 (on the pilot array).
- **Effect sizes.**
  - d̄ and the variance components (method of moments, truncated at 0: σ̂_c² = max(0, (MS_C − MS_CS)/S), σ̂_s² = max(0, (MS_S − MS_CS)/C), σ̂_e² = MS_CS, where MS_CS is the interaction mean square).
  - The frozen matched-pairs rank-biserial correlation, computed on the C configuration means (descriptive).
- **Headline fraction** (A1 − A2)/(A7 − A2). Point estimate = ratio of the grand means. CI: the **two-way (pigeonhole) bootstrap**: configurations and seeds resampled independently with replacement, B = 10,000, seed 770002, 99% percentile interval. BCa's acceleration constant has no agreed two-way definition. The degenerate-denominator rule is unchanged, but it uses the (A7 − A2) min-F′ 99% CI.
- **Other bootstrap CIs** (link ②, link ④, flip-rate monotonicity): the same pigeonhole bootstrap. It is defined for incomplete arrays.

### 2.4 Missing cells (RECOMMENDATION)
The frozen crash rule (§9.4), and D-7, drop a cell from all arms.

For min F′, every configuration row that contains a dropped cell is removed from the confirmatory array, preserving balance, and the removal is reported. As descriptive sensitivity, the analysis is also reported with the affected seed column removed instead.

FACT: 0 crashes and 0 invalid runs occurred in all R1, R2 and R3 verification runs (the conformance suites, 287 main runs each), so this rule is expected to stay unused.

### 2.5 Sensitivity analyses (descriptive, no p-values)
- the frozen Wilcoxon over all cells (Pratt, two-sided);
- the Wilcoxon on the C configuration means;
- the Wilcoxon on the S seed means.

**Disagreement in sign with the primary is reported as a finding**, mirroring the frozen §9.3 practice.

### 2.6 Power procedure (RECOMMENDATION; replaces frozen §12.3 steps 1–3)
1. **Variance components.** From the Stage-1 array of A1 − A2 cell differences (5 × 5, or 10 × 5 with the extension), for each W ∈ {W1, W3}: μ̂ = d̄, and σ̂_c², σ̂_s², σ̂_e² as in §2.3. Stage-1 point estimates are used as they are (frozen: no effect-size adjustment).
2. **Simulation.** For each S ∈ {2, …, 20}, B = 10,000 iterations: draw C = 30 configuration effects a_c ~ N(0, σ̂_c²), S seed effects b_s ~ N(0, σ̂_s²), and cell residuals e_cs ~ N(0, σ̂_e²). Form d_cs = μ̂ + a_c + b_s + e_cs, apply §2.3's test, and reject iff p < 0.01/6. Normal deviates come from `makeRng(770001)` through Box–Muller, in the fixed order a, b, e, row-major.
3. **Selection.** S* = the smallest S with power ≥ 0.80 in **both** W1 and W3. If there is none, S* = 20, and the cap rule (frozen §12.4) applies unchanged.
4. **Run plan.** `n_seeds = S*`; seeds are the first S* of `20260819100–119`; runs = 30 · S* · 7.

**Why it changes:**
- S = 1 (frozen grid value 30 pairs) leaves the seed variance inestimable, so the grid starts at S = 2.
- Resampling 5 pilot seeds with replacement up to 20 seeds would create duplicated, perfectly correlated seed columns, which misrepresent a 20-seed sample. The variance-component simulation does not.

---

## 3. D-4 and D-6: exact metric definitions

### 3.1 Ticks and windows (D-6)
**FACT:**
- Every run makes exactly **3,005** `runAgent()` calls: 287/287 main runs in `evidence_r3` record `measurement.calls = 3005`, as did the recorder.
- `pressSpace` runs the first 5 calls (indices 0–4) before the tick loop. Loop l (0–599) runs calls 5 + 5l … 9 + 5l after `env.setTick(5l)` (`run.js`).

**RECOMMENDATION (ratify):**

| Item | Definition |
|---|---|
| Tick unit | one `runAgent()` call (`tickUnit = 'step'`) |
| Tick index | **τ = i − 5**, where i is the 0-based call index (`measure.mjs` event index). Calls i = 0–4 belong to no window. |
| Phase | Phase II iff τ ≥ 1500 (exact: `setTick(5l)` precedes loop l, and 1500 is a multiple of 5) |
| Windows (inclusive) | W1 τ ∈ [0, 299]; W2 [300, 1499]; W3 [1500, 1799]; W4 [1800, 2999] |
| \|W\| | 300, 1200, 300, 1200 |
| "At tick 1499 / 2999" | the store state after the last call of τ = 1499 (call 1504), i.e. at the loop boundary before `setTick(1500)`; and after call 3004 |

### 3.2 Primary metric (frozen §8.5; operationalisation ratified)
For each run and window: `R_W = ( Σ over events [i, r] with τ = i − 5 ∈ W of r ) / ( |W| / 100 )`.

- A tick without an event contributes 0. Under R1 those are exactly the slip, self no-op and no-decision ticks.
- Stale and replay ticks are **not** excluded (frozen §8.5).
- **FACT, measurable now:**
  - `run_h1r.mjs` saves `measurement.events` (`[callIndex, rewardSignal]`) and `calls`;
  - M1 shows events = learning passes, none on unrealised ticks;
  - M2 shows every value equals the TD reward;
  - M5 shows the driver equals the recorder.

### 3.3 Secondary metrics computable from the saved record now
- **Goal-reach rate** `G_W` = (number of events with r = 12 and τ ∈ W) / (|W|/100).
  - FACT: r = 12 iff the tick was a realised goal entry. The GOAL edit pays exactly 12; every non-goal reward is in {2, 0.3, −0.4} (R1-INFO in `evidence_r3`: move rewards {2, 0.3, −0.4}; all 48,102 goal events = 12).
- **Post-shift recovery half-life** (frozen §8.5, degenerate cases unchanged):
  - TR(τ) = Σ r over τ′ ∈ [τ − 99, τ] (the trailing 100-tick return; the window may straddle 1500, as written);
  - thr = 0.5 · R_W2;
  - t_below = min{τ ∈ [1500, 2999] : TR(τ) < thr}. If none, **HL = 0**;
  - otherwise t_rec = min{τ ∈ (t_below, 2999] : TR(τ) ≥ thr}, and **HL = t_rec − 1500**. If there is no t_rec, **HL = 1500**, right-censored, with censoring counted per arm;
  - thr is used as defined even when R_W2 ≤ 0 (no special case).
- **A5 ≡ A2 identity:** per cell, the fingerprint equality of the A5 and A2 records.
- **F-10 (D-4g):** for arm A1, `R_all = Σ r over τ ∈ [0, 2999] / 30` per run.
  - P̄ = the mean of the pilot configuration means (Stage 1, including the extension).
  - H̄ = the mean of the held-out configuration means.
  - **F-10 fires iff P̄ > 0 and H̄/P̄ < 0.60.** If P̄ ≤ 0, F-10 is reported as "not evaluable".
  - Rationale: the whole run is the most stable measure. The pilot and confirmatory seeds differ, so the ratio is an anti-memorisation sanity check, not a paired comparison.

### 3.4 Link ① (frozen §8.1; needs instruments)
- `n_updates_W` = the number of trust-attempt increments (a += 1) with τ ∈ W. It is 0 for A4 by construction.
- Fraction of traversed keys with ≥ 3 observations, at τ = 1499 and 2999: among directed keys with at least 1 **raw** attempt in the phase, the share with ≥ 3 raw attempts.
- Trust entropy at τ = 1499 and 2999: the Shannon entropy (bits) of trust values `(s+1)/(a+2)` over keys with at least 1 raw attempt, in 10 equal-width bins on [0, 1].

### 3.5 Link ② calibration (D-4c; frozen §8.2, §11.5)
- **Unit (RECOMMENDATION):** the directed trust key `u->v`, because the agent's belief is per directed key.
  - K_τ = the keys with **≥ 5 raw attempts within the phase**: [0, 1499] for τ = 1499, [1500, 2999] for τ = 2999. "Raw" means attempt events counted, not the decayed store count.
  - trust_k = `(s+1)/(a+2)` from the (decayed) store at τ.
  - p_k = that phase's configured `p_e` for k's undirected edge. The two directions share p (ties take average ranks).
- **ρ_run** = Spearman(trust_k, p_k) over K_τ. It is undefined if |K_τ| < 3 (the run contributes nothing; this is reported).
- **F-1 statistic:** the mean of ρ_run over A1 runs at τ = 1499. 99% CI from the pigeonhole bootstrap (§2.3). **F-1 fires iff the mean < 0.30 or the CI includes 0.**
- **Permutation null** (frozen §11.5): per run, 10,000 shuffles of p across K_τ. One generator, `makeRng(770003)`, is used sequentially over runs in the order (configuration index, then seed) ascending. The p-value and the null's 99th percentile are reported.
- **Brier score:** over every drawn attempt in an A1 run, (trust of the attempted key just before the attempt − outcome)². The base-rate predictor is prequential: (successes so far + 1)/(attempts so far + 2), pooled over keys. Brier skill = 1 − Brier/Brier_base is reported.
- **Calibration curve:** 10 equal-width trust bins at τ = 1499, showing the mean p and the count per bin.
- **Anti-memorisation:** the rank partial correlation of trust and p, controlling for the raw attempt count.
- **Undirected pooled variant** (descriptive): per edge, (s₁ + s₂ + 1)/(a₁ + a₂ + 2).

### 3.6 Link ③ flip rate (D-4a; frozen §8.3, F-2)
**FACT** (B2 scoring path):
- A candidate's weight is w = 0.6·F + 0.4·arbitrate(…), when arbitration applies.
- F = clamp_{±400}(Σ TERMS) contains `trustBonus·1.5 = 12·(T − 0.5)`, where T is the delivered `bayesianTrust`.
- arbitrate's `confidenceScore` contains the same 12·(T − 0.5).
- The only stochastic input of the score is one cognitive draw per candidate (the `drift` term).
- `arbitrate` is deterministic (`drift = 0` is passed in).
- Under ERR-08, replay (stale) ticks make **no** selection, so they have no argmax.

**Definition (RECOMMENDATION):** in an A1 run, a **decision tick** is a τ on which `runPrediction` step 0 wrote a selection. At each decision tick:
- argmax₁ = the first key of the existing stable descending sort of the A1 weights;
- the **shadow weight** of each candidate is the weight the conformed scoring path would assign with the E3 delivery set to A2's (T = 0.5), **every other input at its A1 value**:
  - the realised drift value (no new draw);
  - the executive weights;
  - A1's `confidenceState` (the E4 aggregate route is stateful and is **not** shadowed);
  - the **pre-clamp** score. The clamp is re-applied afterwards.

  Candidates whose weight has no trust input keep their weight;
- argmax₀ = the first key of the same stable sort applied to the shadow weights;
- flip(τ) = [argmax₁ ≠ argmax₀].

**Statistics:**
- **F-2** uses the frozen formula: FR = Σ flips / (|τ ∈ [0, 2999]| − replay ticks), pooled over all Stage-2 A1 runs. **F-2 fires iff FR < 0.01.**
- Dual reporting (§9.3): the unfiltered rate = Σ flips / 3000. Under ERR-08 the numerators are identical, and only the denominators differ.
- Per-decision-tick rate and per-window rates: descriptive.
- Monotonicity diagnostic (descriptive): decision ticks binned by max_k |T_k − 0.5| into 5 equal-width bins on [0, 0.5]; Spearman ρ(bin index, rate) with a 99% pigeonhole CI.

**Instrument gates:**
- a mutant whose shadow ignores T must report 0 flips;
- a mutant whose shadow uses T = 1 must report flips;
- argmax₁ recomputed from the recorded weights must equal the executed selection on every non-exploration decision tick.

### 3.7 Link ④ conditional advantage (D-4b; frozen §8.4, F-3)
- **Population:** the flipped decision ticks t of each A1 run (§3.6) with t ≤ 2980.
- **Sample:** m = 10 per run, uniformly without replacement, or all of them if fewer. One generator, `makeRng(770004)` (a new analysis seed), produces a Fisher–Yates permutation of each run's population sorted by t; runs are taken in (configuration index, then seed) ascending order. The first m are kept.
- **Fork:** a fresh process re-executes the identical A1 run (same configuration, seed and R3 position). Immediately before the call of tick t (call index t + 5), the E3 and E4 deliveries switch to A2's for the rest of the fork, which runs through τ = t + 19.
- **Return:** Ret₁(t) = Σ r over τ ∈ [t, t + 19] in the original A1 record; Ret₂(t) is the same window in the fork. The frozen "t..t+20" is read as the 20 ticks [t, t+20).
- **CA** = the mean over the sampled decisions of (Ret₁ − Ret₂).
- **F-3:** the cell value is the mean over the cell's sampled decisions. The 99% CI comes from the pigeonhole bootstrap (cells without a sample contribute nothing). **F-3 fires iff the CI includes 0.**
- Dual reporting: as in §3.6 (identical numerator).

**Fork gates:**
1. A fork that "switches" to A1 reproduces the original run bit for bit.
2. A fork switched to A2 at call 0 reproduces the A2 run bit for bit.
3. Every fork equals the original record for τ < t.

**Cost (INFERENCE):** 10 × 30 × 20 forks, averaging about 1,500 ticks, is roughly 1.3 h on 6 workers.

### 3.8 Other secondary metrics (D-4e, D-4f, D-4h; need instruments)
**Steps-to-goal (D-4e).**
- Episode j starts at τ = 0, or at the tick after a reset (goal or cap).
- It ends at its goal-entry tick (length = goal tick − start + 1), or at a cap reset (right-censored at 150), or at τ = 2999 (right-censored at its length).
- Per run: the Kaplan–Meier median over its episodes. It is "undefined (> max)" if the survival never reaches 0.5.
- Per arm: the median of the run medians, with a pigeonhole CI. Descriptive.
- FACT: goal resets can be identified from r = 12, but **cap resets are not in the saved record**. The frozen cap boundary also has a known 150/151 observation subtlety (`evidence_r1`, cap H7). So boundaries must be recorded, not reconstructed.

**Trajectory entropy (D-4f).** H_W = −Σ p̂ log₂ p̂ over the realised directed transitions (moves and goal entries) with τ ∈ W. H = 0 if there are none. Reported per run for each window and for the whole run; descriptive.

**Slip rate (D-4h).**
- SR_W = slips / attempts over the **drawn, non-goal-entering** edge attempts with τ ∈ W.
- The goal-entering slip rate is reported separately.
- A1 vs A2 paired differences per window, with the §2.3 CI; descriptive.

---

## 4. D-5: measurability from saved data

| Quantity | Needs | Saved by `run_h1r.mjs` now? (FACT) |
|---|---|---|
| Primary metric R_W (W1–W4); F-4, F-5, F-6, F-8, F-9, F-11; headline fraction | reward events with call index | **Yes** |
| Goal-reach rate; half-life and F-7; F-10; A5 ≡ A2 identity | reward events; fingerprints | **Yes** |
| Link ① n_updates (whole run) | `envCounters.attempts` | Yes (whole run only); per window, no |
| Link ① ≥ 3-observation fraction; trust entropy; link ② (F-1), Brier, calibration curve, partial correlation | trust store and raw per-phase attempt counts at τ = 1499 and 2999; per-attempt trust value | **No** |
| Link ③ (F-2), monotonicity | per-decision candidate weights, shadow weights, pre-clamp score, replay flags | **No** |
| Link ④ (F-3) | fork driver and mid-run arm switch | **No** |
| Steps-to-goal | reset events (goal and cap) with τ | **No** (goal resets yes, cap resets no) |
| Slip rate per window, excluding goal entries; trajectory entropy | per-attempt record (τ, from, to, goal-entering, outcome) | **No** (whole-run totals only) |
| A5 floor-binding activity | a counter at `updateBehavior`'s floor | **No** |

**FACT, conclusion:** every **primary** quantity is measurable from saved data without any further code. Links ①–④, which carry F-1, F-2 and F-3, are not.

---

## 5. D-7: validity failures
The validity conditions now number 11. **RECOMMENDATION:** any false condition = a crash under frozen §9.4.
- From `run.js`: `completed`, `episodeCapArmed`, `replayCooldownDeterministic`.
- From `run_h1r.mjs`: `runtimeAttached`, `transformMatches`, `measurementClean`, `envStreamScoped`, `envDrawsWithinReserve`, `cognitiveDrawsWithinReserve`, `visualDrawsWithinReserve`, `envSegmentDisjointFromConfig`.

The whole (configuration, seed) pair is dropped from all 7 arms, counted and reported, and the D-3 row rule applies.

Separately: a registry refusal at planning time means the run never executes (it is not an exclusion). A determinism re-run mismatch (§16) halts the study, as a gate failure does.

---

## 6. D-6
See §3.1.

---

## 7. D-8: gate battery
**FACT** (`evidence_r3/existing_gates.json`, conformance ON):
- `verify_M7` 49/0, `verify_G8` 21/1 (G8.4c), `verify_G9` 11/0, `verify_G10` 38/0, `verify_e5` 30/0, **`verify_G15` 24/0**, `verify_G16` 28/0;
- OFF ≡ pristine on 25/25 scripts;
- the existing scripts run under H1R **without** a design position, so they use the B2 environment stream. They test mechanisms, not the R3 stream.

**RECOMMENDATION.** The **blocking set** before Stage 1 and again before Stage 2:
- **Frozen:** G1–G6, G8–G16, with H1R-S4 (G8.4c becomes "≥ 0, reported") and H1R-S5 (G15 → G15′).
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
  - **R3-F, R3a, R3b, R3c, R3c2, R3d, R3e, R3h, R3j, R3-DRV, R3-CAL, R3-AV**;
  - H1, H2;
  - plus every gate of the measurement-layer milestone.
- **Non-blocking, reported:**
  - R2b. It now passes, but it pools arms that share a stream by design, so R3-CAL is the correctly specified calibration gate;
  - P1;
  - F2 and G15′ as originally declared;
  - the INFO gates;
  - the classified historical failures with conformance ON: e1e2 G1f/AV8b, cap B1/B3/B4/H7, goal B2/B3, stepledger A3, S1b S1.7, S2 S2.4b.

---

## 8. D-9: A5
**FACT** (`evidence_r3`, P1): A5 ≡ A2 on 7/41 diagnostic configurations; no other arm pair is identical. The draft's "10/41" is the R1 value.

**RECOMMENDATION:** retain A5 unchanged (frozen §4.2). Report, descriptively:
- (i) A5 ≡ A2 identity counts per window. Computable now.
- (ii) Floor-binding counts in A1 and A5. Needs one observational counter.

Interpretation rule as in draft §2.3.

---

## 9. D-10: exploratory 2×2 PE factorial
**FACT:**
- Under R1 no slip reaches the PE pathway, and state-PE is 0 by construction in B2 (draft §2.2, S3-a/b).
- The factorial needs a "PE-α on" variant (learning authority unpinned, `dampQ` enabled). That variant is neither one of the 7 arms nor implemented.
- Frozen §10.2 makes the factorial exploratory, with no pre-registered n.

**RECOMMENDATION:** **waive it explicitly** in the freeze, on these grounds: it is uninformative about slips under R1, and running it needs new arm code. This is a recorded waiver, not a silent drop.

---

## 10. D-11: governance
**FACT:**
- `research/09_decisions.md` exists (1,365 lines). The only tracked file under `research/` that mentions H1-R is `H1R_ERRATUM_R3_ENVIRONMENT_SEED.md`.
- Three M7 governing documents are still untracked:

  | Document | SHA-256 |
  |---|---|
  | `M7_SCIENTIFIC_SPEC_DRAFT.md` | `27865156379bbe39402b96665154b96b5f79dfd36d0fbbf689f6d0b40d360d57` |
  | `M7_GATE_SEMANTICS_AUDIT.md` | `ee09a15549d73f06af36caaf0672dce0682fc8e3947c37c69bec41e30f64560d` |
  | `M7_CHARACTERIZATION_FINDINGS.md` | `6b79436e4afdb06ab8dc4b58a5e7f56e2103c854669ce58c25c850d0747383fd` |

**RECOMMENDATION:**
- Add decision-log entries for: the conformance authorisation, the conformance correction, R1 (`742f239`), R2 (`19d0786`), R3 (`e8e904a`), and the freeze itself.
- Commit the three documents with `-text` in `.gitattributes`, so the cited digests survive checkout. The same applies to the frozen H1-R document and its `.sha256`.

---

## 11. The "~1 in a million" configuration-generator claim

**Claim under review:** `R3_REPORT.md` §4 UNRESOLVED 2 says "the per-run probability is about 1 × 10⁻⁶". It repeated in my R3 summary.

**FACT, why it is the wrong model.** The figure equals 5,119/2³² = 1.19 × 10⁻⁶. That is the chance that a **uniformly random** generator start state touches a given 4,096-draw environment segment (reserve rule: d ∈ [−1023, 4095]). But a configuration's generator starts at its own seed: a small integer in a narrow, sequential range, not a uniform state. For a position (s, i), the run is flagged iff its accepted seed lies in an **enumerable** set `{ e + d·C mod 2³² : d ∈ [−(n_c − 1), n_e − 1] }`, where e is the position's environment seed, n_c the generator draws and n_e the environment draws.

**FACT, exact enumeration** (no configuration generated):

| Material | Reserve rule (n_e = 4096, n_c = 1024; the validity flag) | Actual consumption (n_e ≤ 3000, n_c = 756) |
|---|---|---|
| Pilot: seeds `004–009` × pilot × index 0–9, candidates `893000–894999` | **0** touching seeds | **0** |
| Confirmatory: seeds `100–119` × held-out × index 0–29, candidates `900500–960499` | 44 (cell, seed) contacts | 31 |

**INFERENCE, model probability.** Accepted seeds follow sequential geometric acceptance, with per-goal rates fitted to the ERR-09 samples. Σ over all 600 confirmatory cells of P(accepted seed at index i ∈ that cell's set):

| | P(any confirmatory cell flagged) |
|---|---|
| Reserve rule | ≤ **1.95 × 10⁻⁶** (dominated by seed 119, indices 8 and 9, candidate 901853: 6.4 × 10⁻⁷ and 1.3 × 10⁻⁶) |
| Actual consumption (a real shared state) | ≤ **3.2 × 10⁻¹⁴** |

**RECOMMENDATION: remove the "per-run ≈ 1 × 10⁻⁶" sentence and replace it with:**

> "Pilot positions: no candidate seed can be flagged (exact). Confirmatory positions: whether a run is flagged is a deterministic function of the not-yet-generated accepted seeds. Under a geometric acceptance model fitted to the ERR-09 rates, P(any of the 600 confirmatory cells flagged) ≤ 2 × 10⁻⁶ under the conservative reserve rule and ≤ 4 × 10⁻¹⁴ for an actual shared state. A flagged cell is dropped under D-7."

The per-run flag stays as it is: conservative and cheap.

**Reproduction:** session scratch script `cfggen_prob.mjs`. RECOMMENDATION: add it to `h1r_prereg_checks/` at freeze.

---

## 12. What still requires code changes (none made here)

| # | Change | Needed for | Blocks |
|---|---|---|---|
| 1 | **Measurement layer, part 2:** observational probes and recorder for the per-tick record (call index, replay, decision, no-commit); the per-attempt record (τ, edge, goal-entering, outcome, pre-attempt trust); reset events; trust snapshots with raw per-phase attempt counts at τ = 1499 and 2999; per-decision A1 and shadow weights (pre-clamp score, A1 drift reuse); the A5 floor counter. Each probe needs neutrality, exactness and anti-vacuity gates. | Links ①–③; F-1, F-2; D-4e, f, h; D-9 | Stage 1 (so both stages use one instrument) |
| 2 | **Fork driver and mid-run arm-switch hook** (call-indexed), with the three fork gates | Link ④, F-3 | Stage 2 (recommended before Stage 1) |
| 3 | **`analyze.js`:** windows, metrics, min F′, pigeonhole bootstrap, permutation null, power simulation, F-criteria. Verified on synthetic fixtures with known answers; no outcome values. | All analysis | Stage 1 analysis |
| 4 | **Run orchestrator:** stage plan from `generateAcceptedStream` with the 894999 hard bound; a registry check before each run; one process per run; the 5% determinism re-runs (draft §16); record storage | Stage 1 and 2 execution | Stage 1 |
| 5 | **Registry data:** the H1-R pilot block `893000–894999`; trajectory records (H1-R, pilot) for `004–008`; confirmatory records for `100–119` as used; held-out configuration use by H1-R | D-2 | Stage 1 |
| 6 | **Documents:** correct `R3_REPORT.md` §4 UNRESOLVED 2 (§11); produce the frozen H1-R document; decision-log entries; commit the three M7 documents; `.gitattributes` | D-11, freeze | Freeze |

**Not needed:** any change to the agent, the transform, R1–R3, the seed derivation, the validity flags or the primary-metric recorder.

---

## 13. Statements in the draft that are now stale (fix at freeze)

| Draft section | Stale statement | Now (FACT) |
|---|---|---|
| §1 rulings table; §8 build identity | the instrument is `742f239`, transform `e24f6057…`, runtime `d6169141…` | R3 `e8e904a`, transform `cf30e20a…`, runtime `48844fc1…`, plus `env_seed.mjs` `80caf09a…` and `rng.js` as the fourth transformed file |
| §5 last bullet; §6.3 goal row | goal-entering moves are draw-free and uncredited | they draw and are credited (R2a–R2e) |
| §2.3, §15 | A5 ≡ A2 in 10/41 | 7/41 (`evidence_r3`) |
| §9.2 item 3 | the B2-stream overlap claim, "≤ 78,538 cognitive draws" | the R3 overlap proof; max cognitive 89,317 |
| §10.4 | 4/287 runs without a goal reach | 10/287 under R3 streams (diagnostic material, pooled) |
| §14 F-11 note; §17 qualifier; §19 items 1, 8, 17, 20; §20 D-1 | they depend on D-1 | D-1 resolved by R2; remove the "goal-entering moves draw-free" qualifier |

---

## 14. Recommended preregistration freeze package (one package)

**Rule on all of the following in one ruling:**
1. D-2 as in §1: pilot `893000` stream × seeds `004–008`; the extension adds 5 configurations with the same seeds.
2. D-3 as in §2: crossed random factors; min F′ primary test with Holm; the matching CI for "≈", F-4 to F-9 and F-11; the pigeonhole bootstrap for ratio and link CIs; the missing-cell rule; the variance-component power procedure (S ∈ 2–20).
3. D-4 and D-6 as in §3: τ = i − 5 and every link, secondary and F-criterion definition, including the new analysis seed 770004.
4. D-5 as in §4: the primary metric is ratified as already measurable; the measurement layer, part 2, plus forks and `analyze.js` are a post-freeze implementation milestone that must be complete and verified before Stage 1.
5. D-7, D-8, D-9 and D-10 as in §5, §7, §8 and §9 (D-10 waived).
6. D-11 as in §10, and the stale-statement corrections in §13.
7. Replace the "~1 × 10⁻⁶ per run" sentence as in §11.

**Then, in order:**
1. I produce **H1-R pre-registration v1.0** (the draft plus these rulings, all stale facts corrected, supersession register H1R-S1 to S5 plus R3), with its SHA-256 file and `-text`, the decision-log entries and the three M7 documents. All of this is one documentation commit, and no code.
2. The **measurement-layer milestone** (§12 items 1–5), verified on diagnostic material with blinded reporting.
3. Stage 1.

Nothing in this package changes the agent, the environment, the arms, the windows, α, the six-member family, the falsification thresholds or the claim ceiling. What changes is the statistical unit (D-3), the extension's seed reuse (D-2) and the waiver (D-10). All three are named deviations, with their reasons stated here.

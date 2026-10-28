# COG-A — power analysis (method fixed in M-COGA-2; results filled in M-COGA-4/5)

No sample size is claimed in this file until the simulation below has run on development-derived nuisance parameters and δ has
been fixed. The earlier n = 120 is not used: it had no derivation and referred to a different outcome.

## Unit and structure

- Experimental unit: an **accepted world** (second-stage acceptance, ≥ 1 DISTAL state). Within a world, an agent contributes one
  SWAP and one NO-SWAP session; the outcome pairs are the world's DISTAL states encountered in both (AA). Pairs within a world are
  dependent (same agent history), so the world is the resampling unit.
- Paired structure: both conditions share the pre-shift history exactly (I-IDENT), and the environment's common random numbers.
- Stratification: goal (4 strata, equal allocation by construction, configIndex mod 4).

## Simulation model (operating characteristics of the real estimator and interval)

For each candidate n (accepted worlds) and each true effect θ:
1. **World structure** drawn with replacement from the development distribution of (number of DISTAL states, encounter indicators
   V_S and V_N per state), taken from the development MFW sessions. Visitation is not an outcome under the blinding rule
   (DESIGN.md §10).
2. **NO-SWAP outcome** Y_N drawn from its development rate, which is also not blinded.
3. **SWAP outcome** Y_S drawn as Bernoulli(clip(r_N + θ_w)), with world-level heterogeneity θ_w = θ + N(0, τ²) and
   within-pair correlation ρ between Y_S and Y_N.
   - The primary scenario takes ρ = 0, which is conservative: identical pre-shift histories make the true correlation positive,
     and positive correlation lowers Var(Y_S − Y_N).
   - Sensitivity: ρ ∈ {0, 0.3}, τ ∈ {0, 0.1}.
4. **Analysis exactly as preregistered:** the event-weighted θ̂, a goal-stratified world bootstrap (B = 2,000 in simulation;
   10,000 in the real analysis), and the 95% percentile interval.
5. **Reported**, from R = 1,000 replicates per cell:
   - P(L > 0) at θ = δ (power);
   - P(L > 0) at θ = 0 (type I);
   - P(equivalence) at θ = 0;
   - interval coverage;
   - all of these under lower AA support (the AA share scaled by 0.75 and 0.5).

**Type I under the real QB-1 structural null.** QB-1 sessions on the development-simulation worlds (cheap; baselines only):
- the rejection rate of θ = 0;
- interval coverage of θ_QB1 = 0 by the real pipeline, at the candidate n.

This checks the finite-sample behaviour of the ratio estimator (`M1_AUDIT.md` §4), not just the model above.

**Choice of n.** The smallest n on a fixed grid with:
- P(L > 0 | θ = δ) ≥ 0.80;
- P(equivalence | θ = 0) ≥ 0.80;
- empirical type I ≤ 0.06.

All three are judged at the primary scenario, with the sensitivity cells reported. The confirmatory number of stream indices
follows from n and the acceptance rate (18/30 on the development worlds; re-estimated on the simulation stream). If n is
infeasible in compute time, the trade-off is presented to the Research Director. δ and the significance level are never changed
after results.

## Results (development nuisance parameters; `evidence/power_sim.json`, R = 500, B = 1,000)

**Nuisance parameters** (development MFW, blinded; `evidence/dev_analysis.json`):
- 18 accepted worlds, with goal pools 6 / 5 / 4 / 3;
- 30 DISTAL pairs, all AA (q = 1.0);
- AA pairs per world: 1–4, mean 1.67;
- NO-SWAP Y rate r_N = 0.300.

Acceptance rates: 18/30 on the development worlds; 254/400 (63.5%) on the development-simulation stream.

| δ | n = 80 power / equiv. | n = 120 | n = 160 | n = 240 | n = 320 | n = 400 | smallest n with both ≥ 0.80 |
|---|---|---|---|---|---|---|---|
| 0.05 | 0.14 / 0.00 | 0.21 / 0.00 | 0.25 / 0.00 | 0.32 / 0.00 | 0.40 / 0.00 | 0.48 / 0.04 | not on the grid (> 400) |
| 0.10 | 0.40 / 0.02 | 0.52 / 0.17 | 0.70 / 0.44 | 0.84 / 0.73 | **0.91 / 0.87** | 0.95 / 0.95 | **320** |
| 0.15 | 0.72 / 0.52 | **0.89 / 0.81** | 0.96 / 0.93 | 0.99 / 0.99 | 1.00 / 1.00 | 1.00 / 1.00 | **120** |
| 0.20 | **0.91 / 0.89** | 0.98 / 0.98 | 1.00 / 1.00 | 1.00 / 1.00 | 1.00 / 1.00 | 1.00 / 1.00 | **80** |

Type I at θ = 0 lies between 0.012 and 0.034 in every n. Coverage lies between 0.92 and 0.96.

**Cost.**
- Stream indices needed ≈ n / 0.62.
- An MFW session takes about 15 s with 10 workers, and there are two per world.
- δ = 0.10 (n = 320) is about 640 MFW sessions, about 16 minutes of run time.

Compute does not constrain δ.

**Still to run before the freeze**, once δ is fixed:
- the sensitivity cells (ρ = 0.3, τ = 0.1, AA support × 0.75 / 0.5) at the chosen δ and n;
- confirmation of the chosen cell at R = 2,000, B = 2,000.

## Status

| item | status |
|---|---|
| method | fixed (this file) |
| nuisance parameters | done (development, blinded) |
| power curves over δ | done (table above) |
| n | after δ (Research Director) |

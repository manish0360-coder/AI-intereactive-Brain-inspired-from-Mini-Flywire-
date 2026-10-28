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

## Status

| item | status |
|---|---|
| method | fixed (this file) |
| nuisance parameters | M-COGA-4 (development MFW and baseline sessions, blinded) |
| power curves over δ | M-COGA-4, presented with the δ / q_min decision |
| n | M-COGA-5, after δ |

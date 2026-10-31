# ACQ-1 — power analysis

Reproduce: `node experiments/coga/acq1/power.mjs --dev experiments/coga/acq1/evidence/dev_rows.json --out <file> --R 20000 --delta 0.10`
(fixed seeds; `evidence/power_sim.json`, `evidence/power_sim.txt`).

## What is simulated

- **Unit:** the world. All dependence among states and decisions within a world is carried by the world statistic Δ_w itself, so no
  within-world model is needed.
- **Nuisance input:** the 30 development worlds' Δ_w = ψ_w(MFW-P) − ψ_w(RW), window [9000, 12000): SD 0.188. These are centred, so the
  development effect estimate plays no part; only the spread is used.
- **Generative step:** Δ*_w = (Δ_w − mean) · c + θ + N(0, τ²), resampled within goal; each world lost with probability `loss`.
- **Analysis:** the frozen stratified t interval, `analysis.mjs` `interval`, the code the real analysis calls.
- **Replicates:** 20,000 per cell.

The development SD comes from 30 worlds, so it is uncertain; c = 1.25 covers its upper confidence region. τ = 0.10 adds heterogeneity of
the effect beyond what the development worlds show. 5% loss is the void limit.

## Interval

The percentile bootstrap was tried first and **rejected**: in simulation (R = 2,000) its two-sided type I was 0.053–0.079 and coverage
0.92–0.95. The statistic is a plain mean, so a stratified t interval with Welch–Satterthwaite df is used. Type I is then 0.047–0.055 and
coverage 0.945–0.953 across all 48 cells. The bootstrap stays as a sensitivity analysis. This change was made at design time, on
simulated data, before any confirmatory outcome.

## Results at δ = 0.10

| n | scenario | type I | equivalence at θ = 0 | power at θ = δ |
|---|---|---|---|---|
| 60 | primary | 0.051 | 0.984 | 0.988 |
| 60 | SD × 1.25, τ 0.10, 5% lost | 0.049 | 0.745 | 0.839 |
| 80 | primary | 0.050 | 0.998 | 0.998 |
| 80 | SD × 1.25, τ 0.10, 5% lost | 0.053 | **0.895** | 0.929 |
| **100** | primary | 0.051 | 1.000 | 1.000 |
| **100** | SD × 1.25 | 0.052 | 0.989 | 0.992 |
| **100** | τ 0.10 | 0.052 | 0.997 | 0.998 |
| **100** | SD × 1.25, τ 0.10, 5% lost | 0.050 | **0.962** | **0.969** |
| 120 | SD × 1.25, τ 0.10, 5% lost | 0.053 | 0.985 | 0.987 |

## Choice of n

**Rule, fixed before any confirmatory outcome:** the smallest n on the grid {40, 60, 80, 100, 120, 160} with power ≥ 0.90, equivalence
≥ 0.90 and type I ≤ 0.06 in **every** scenario.

**n = 100 accepted worlds**, 25 per goal. n = 80 misses by equivalence 0.895 in the worst scenario.

**Cost:** 100 worlds × 3 MFW variants × 2 environments = 600 sessions, plus 10 repeated worlds × 2 = 20, at about 100–120 s per session
with 10 workers, or about 2 hours. Compute does not constrain the choice.

## Limits

- The simulation assumes that the spread of Δ_w on fresh worlds resembles the development spread within the scenarios covered.
- It says nothing about whether the true effect is near δ. The development estimate is not used as a prediction.

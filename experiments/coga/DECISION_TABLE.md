# COG-A — decision table (prespecified; δ and q_min to be fixed before the freeze)

**Framework.** Two interval statements about the primary θ_MFW, both read off one 95% bootstrap interval [L, U] (DESIGN.md §6):
- **difference from zero**: L > 0 (or U < 0), the two-sided 5% test of θ = 0;
- **equivalence within ±δ**: −δ < L and U < δ (two one-sided tests at 2.5% each, TOST).

Together they give the standard four-way reading of a result against a smallest effect of interest (Lakens, Scheel & Isager,
"Equivalence testing for psychological research", *AMPPS* 2018). The sample size is chosen so that both statements are adequately
powered (`POWER_ANALYSIS.md`): P(L > 0 | θ = δ) and P(equivalence | θ = 0).

## Preconditions (checked first; any failure ends the evaluation at that row)

| row | condition | result |
|---|---|---|
| R8 | more than 5% of confirmatory worlds void (crash, I-IDENT, I2, I-GUARD, clock violation), or an implementation defect found after the freeze | **VOID** |
| R1 | the positive control failed before the freeze (Dyna-Q − QB-1 not above δ, see below), or I-NULL fails on the confirmatory worlds (QB-1's interval not inside ±δ) | **NON-EVALUABLE: the task or the pipeline does not discriminate** |
| R7 | AA share q < q_min, or MFW pre-swap competence P2 fails (MFW's late-phase-I agreement with π₁* not above the random walk's: lower bound of the paired difference ≤ 0) | **NON-EVALUABLE** |

## Rows on [L, U] of θ_MFW (first matching row applies)

| row | condition | reading | recommendation |
|---|---|---|---|
| R2 | L > 0 and not (U < δ), and I-SPEC holds (upper bound of λ_MFW < δ) | a non-trivial, specific change-driven shift toward the newly optimal action: cross-state propagation (planning or replay) | **SUPPORTED** |
| R2b | L > 0 and not (U < δ), and I-SPEC fails | a change-driven shift that is not shown to be specific; consistent with surprise-driven exploration | **INCONCLUSIVE (non-specific)** |
| R3 | L > 0 and U < δ | a statistically detectable but practically negligible effect | **NOT SUPPORTED (negligible effect)** |
| R4 | L ≤ 0 ≤ U and −δ < L and U < δ | equivalent to zero within ±δ | **NOT SUPPORTED (no meaningful effect)** |
| R5 | U < 0 | the change makes MFW *less* likely to choose the newly optimal action (perseveration); engineering diagnosis; the CREDIT-1 resume check | **NOT SUPPORTED (opposite direction)** |
| R6 | anything else (L ≤ 0 ≤ U and the interval reaches ±δ) | the data cannot distinguish a meaningful effect from none | **INCONCLUSIVE** |

The rows are mutually exclusive and exhaustive over L ≤ U (the gate checks this on a grid). Secondary analyses (M1–M5, the
baselines, Dyna-Q's θ) never change the row.

## Positive control (development only, before the freeze)

- Estimand PC = θ_Dyna − θ_QB1, paired by world, with the primary's eligibility, outcome, pairing and bootstrap.
- Worlds: the development-simulation worlds (DESIGN.md §9; baselines only), with their number fixed before the PC is computed; the
  development worlds 0–29 are reported alongside, descriptively.
- **Passes** iff the lower bound of PC exceeds δ. No power is claimed for it in advance.
- **Fails** otherwise: no confirmatory run. If the interval lies entirely below δ, the task does not discriminate under this
  design (report and redesign). If it contains δ, the result is inconclusive and any further development territory needs a new,
  declared decision.

## What each recommendation licenses

| recommendation | may be claimed | may not be claimed |
|---|---|---|
| SUPPORTED | in this world class, MFW propagates experienced change across states to decision states it has not acted from since the change, specifically, by at least a meaningful amount | a cognitive map; model-based planning as distinct from replay; generality beyond this graph, change type and horizon; general cognition or intelligence; which MFW component is responsible |
| NOT SUPPORTED | this procedure found no meaningful (or only a negligible, or an opposite) effect | that MFW cannot propagate under any procedure |
| INCONCLUSIVE | neither | either |
| NON-EVALUABLE / VOID | nothing about θ | anything about θ |

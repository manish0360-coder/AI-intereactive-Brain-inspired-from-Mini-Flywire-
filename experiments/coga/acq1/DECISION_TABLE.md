# ACQ-1 — decision table (prespecified)

One 95% stratified t interval [L, U] of Δ = E_w[ψ_w(MFW-P) − ψ_w(RW)], window [9000, 12000), read against δ = 0.10:
**difference from zero** (L > 0, U < 0) and **equivalence within ±δ** (−δ < L and U < δ), the standard superiority-plus-equivalence
reading (Lakens, Scheel & Isager, *AMPPS* 2018). Rows are checked in this order; the first that applies decides.

## Preconditions

| row | condition | recommendation |
|---|---|---|
| A8 | more than 5% of worlds void, or any repeat session not byte-identical, or an implementation defect found after the freeze | **VOID** (non-evaluable) |
| A7 | the instruments fail on the confirmatory worlds: RW's ψ interval not inside ±δ, or QB-1's ψ lower bound not above δ | **NON-EVALUABLE** |

## Primary

| row | condition | reading | recommendation |
|---|---|---|---|
| A1 | L > 0 and not (U < δ) | MFW's choices shift toward the action optimal for the experienced reliabilities; the shift is detectable and not negligible | **SUPPORTED** |
| A2 | L > 0 and U < δ | a detectable but negligible shift | **NOT SUPPORTED (negligible effect)** |
| A3 | L ≤ 0 ≤ U, −δ < L, U < δ | equivalent to no acquisition within ±δ | **NOT SUPPORTED (no meaningful effect)** |
| A4 | U < 0 | choices shift away from the better action | **NOT SUPPORTED (opposite direction)** |
| A5 | otherwise | the data cannot separate a meaningful effect from none | **INCONCLUSIVE** |

`L ≥ δ` is reported in addition: under A1 it says the effect is shown to exceed the margin, not merely to be non-negligible.

Sensitivity rows at δ = 0.05 and δ = 0.15 are reported. They never replace the decision. Secondary contrasts, R, the curve, the raw
metrics and the reference agents never change the row. The rows are exclusive and exhaustive over L ≤ U (`test_acq1.mjs`, A2).

## Licences

| recommendation | may be claimed | may not be claimed |
|---|---|---|
| SUPPORTED | in this world class and budget, MFW's decisions come to depend on experienced edge reliability, toward the better action | a cognitive map, a world model, planning, propagation across states, transfer, general cognition, which mechanism is responsible |
| NOT SUPPORTED | no meaningful acquisition by this procedure within 12,000 steps | that MFW cannot acquire under a longer budget or another procedure |
| INCONCLUSIVE | neither | either |
| NON-EVALUABLE / VOID | nothing about Δ | anything about Δ |

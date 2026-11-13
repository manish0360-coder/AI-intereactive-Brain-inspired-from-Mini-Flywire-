# CF-03c Gate Results — calibration robustness of world model v3

**Verdict: CF-03c PARTIAL. The model's calibration claim does not generalise.** Of four reliability families it
had never been run on, the criteria held in one (BIMODAL) and failed in three (WIDE, ARCSINE, HIGH).

The two repairs themselves hold: no prediction outside [0, 1] anywhere, and no cost on the development family.

The gate was run once. Nothing was re-run or tuned after the outcome.

| Item | Value |
|---|---|
| Evidence category | Development evaluation gate. Not confirmatory; local commits; no independent reproduction |
| Command | `node experiments/cf03c/run_gate.mjs --domain gate3c` (exit 0) |
| Code and spec | HEAD `2821603`; `GATE_SPEC.md` SHA-256 `ca53cce7…d8a9`; frozen before the run |
| Environment | Node v24.15.0, win32-x64 |
| Result file | `gate3c_result.json`, SHA-256 `4792ea41…cf91`; row hash `f2ed201f…5083` |
| Worlds | `cf|gate3c|world|0…19`, five families each; 0 excluded; 0 censored test episodes |
| Tests | 127/127; two in-process runs identical |

## What may be claimed

Under the verdict table frozen in the specification:

- **Claimed:** on BIMODAL worlds, and on fresh worlds of the development family U5, v3 is calibrated within the
  limit and more skilful than both a constant forecaster and a per-pair Laplace forecaster.
- **Not claimed, because it failed:** calibration or skill "across reliability families". On WIDE and ARCSINE a
  per-pair Laplace forecaster with no sharing between pairs is **better** than the model and the model's
  calibration error exceeds the limit. On HIGH the constant forecaster is **better** than the model.
- **The CF-03b claim stays as amended:** calibrated on worlds from the generator the model was developed on.

## Criteria by family

| Family | K1 not worse than CONST | K1 better than CONST | K2 ECE upper bound ≤ 0.05 | K3 better than LAPLACE | Holds |
|---|---|---|---|---|---|
| WIDE (0.1 + 0.9u) | yes | yes | **no** (0.0553) | **no** | **no** |
| BIMODAL (0.95 / 0.55) | yes | yes | yes (0.0468) | yes | **yes** |
| ARCSINE | yes | yes | **no** (0.0548) | **no** | **no** |
| HIGH (0.9 + 0.1u) | **no** | exempt | yes (0.0166) | yes | **no** |

| Other criteria | Result | Held |
|---|---|---|
| K4 Brier(V2) − Brier(V3) on U5 | −0.0002 [−0.0005, 0.0000] (limit: lower bound > −0.002) | yes |
| K4 MBVI3 − MBVI2 steps | E1 0 · E3 0 · E2P 0 · E1S −0.3 [−0.8, 0.0] | yes |
| K5 invalid predictions by V3 | 0 in every family | yes |
| K6 determinism and tests | identical runs; 127/127 | yes |

## The numbers

Brier score on the move event over all attempts (lower is better). **Bold** marks the best in each family.

| Family | V3 | V2 | CONST | LAPLACE | V3 without pooled move prior | V1 |
|---|---|---|---|---|---|---|
| U5 (development) | 0.1902 | **0.1900** | 0.1940 | 0.2051 | 0.2072 | 0.2123 |
| WIDE | 0.2158 | 0.2158 | 0.2499 | **0.2112** | 0.2123 | 0.2207 |
| BIMODAL | 0.1769 | **0.1768** | 0.1944 | 0.1859 | 0.1880 | 0.1895 |
| ARCSINE | 0.1959 | 0.1957 | 0.2409 | **0.1942** | 0.1958 | 0.1999 |
| HIGH | 0.0502 | 0.0500 | **0.0478** | 0.0935 | 0.0960 | 0.0781 |

Paired differences (positive means V3 is better), mean and 95% interval over 20 worlds:

| Family | Brier(CONST) − Brier(V3) | Brier(LAPLACE) − Brier(V3) |
|---|---|---|
| U5 | +0.0038 [0.0020, 0.0059] | +0.0149 [0.0135, 0.0164] |
| WIDE | +0.0341 [0.0302, 0.0380] | **−0.0046 [−0.0055, −0.0037]** |
| BIMODAL | +0.0175 [0.0156, 0.0194] | +0.0090 [0.0071, 0.0108] |
| ARCSINE | +0.0450 [0.0390, 0.0513] | **−0.0017 [−0.0031, −0.0001]** |
| HIGH | **−0.0024 [−0.0026, −0.0021]** | +0.0433 [0.0427, 0.0441] |

Calibration error (weighted per-run ECE, interval by bootstrap over worlds) and its noise floor:

| Family | V3 ECE | Noise floor | CONST ECE | V3 on a pair's first attempt |
|---|---|---|---|---|
| U5 | 0.033 [0.029, 0.037] | 0.030 | 0.025 [0.020, 0.029] | 0.096 |
| WIDE | 0.050 [0.045, 0.055] | 0.039 | 0.049 [0.043, 0.055] | 0.118 |
| BIMODAL | 0.043 [0.040, 0.047] | 0.034 | 0.030 [0.024, 0.036] | 0.119 |
| ARCSINE | 0.050 [0.046, 0.055] | 0.040 | 0.042 [0.034, 0.051] | 0.105 |
| HIGH | 0.014 [0.012, 0.017] | 0.013 | 0.008 [0.006, 0.010] | 0.072 |

**In every family the constant forecaster's calibration error is as low as the model's or lower.** Calibration
error does not measure whether a model knows anything. What separates the model from a constant is resolution:

| Family | Resolution: V3 | CONST | LAPLACE |
|---|---|---|---|
| U5 | 0.0059 | 0.0005 | 0.0063 |
| WIDE | 0.0351 | 0.0019 | 0.0399 |
| BIMODAL | 0.0203 | 0.0009 | 0.0210 |
| ARCSINE | 0.0484 | 0.0041 | 0.0516 |
| HIGH | 0.0000 | 0.0000 | 0.0001 |

Learned hyper-parameters: U5 μ 0.738, S mostly 8; WIDE μ 0.501, S 2–4; BIMODAL μ 0.736, S 2–4; ARCSINE μ 0.584,
S 1–4; HIGH μ 0.950, S 16–64.

## Why it failed where it failed (descriptive; not tested)

- **WIDE and ARCSINE.** Edge reliabilities are spread wide. The model learns a weak pooled prior (S 2–4), close to
  the Laplace prior (S = 2), but shrinks each pair slightly more than Laplace does, which lowers resolution
  (0.0351 against 0.0399 on WIDE). Sharing between pairs helps when pairs are alike and costs when they are not.
- **HIGH.** Every edge is nearly reliable, so there is nothing to resolve and the constant is hard to beat. The
  model is slightly worse than the constant on first attempts (ECE 0.072 against 0.045): the impassable-exit
  component multiplies every untried pair's move probability by 0.95, which under-predicts when no exit is
  impassable.
- **First attempts are poorly calibrated in every family** (0.07–0.12), for the same reason and because the pooled
  mean is still being learned.

## Pre-declared expectations against the outcome

| Expectation | Outcome |
|---|---|
| V3 without the pooled move prior is worse than V3 in every family | **Wrong.** Worse on U5, BIMODAL and HIGH; **better on WIDE** (−0.0035 [−0.0045, −0.0026]); no different on ARCSINE (−0.0001 [−0.0016, 0.0015]) |
| V3 without the pooled novelty rate equals V3 on the move event and is worse on the modal-destination statistic | Right: differences of exactly 0 on the move event; modal ECE 0.064–0.089 against 0.030–0.058 |
| BIMODAL is the family most likely to fail | **Wrong.** It is the only one that passed |

The second row settles a question from the CF-03b review: the pooled **move** prior is what moved CF-03b's
calibration statistic on the development family, and the pooled novelty rate matters only for where a move leads.

## The battery on fresh worlds (reported)

| Task | DYNAQ | MBVI2 | MBVI3 | MBVI3 without change detection |
|---|---|---|---|---|
| E1 EXPLORED | 30.3 | 20.3 | 20.3 | 20.3 |
| E3 | 190.6 | 41.8 | 41.8 | 445.0 |
| E1S EXPLORED | 51.9 | 26.2 | 25.9 | 26.1 |
| E2P PRE | 28.9 | 19.2 | 19.2 | 152.2 |

MBVI3 and MBVI2 are identical on the three deterministic tasks. Removing change detection costs +403 steps on
reward relocation [275, 532] and +133 on the detour [105, 164]. DYNAQ − MBVI3: E3 +148.8 [50.9, 270.2], E1
+10.1 [7.9, 12.5], E1S +26.0 [15.0, 39.9], E2P +9.7 [6.7, 13.2]. Changes declared on stationary families: at most
0.2 per run.

## What this shows, and what it does not

**Shown:**
- Both defects are repaired without cost on the development family.
- The model is more skilful than a constant forecaster wherever edges differ from each other (WIDE, BIMODAL,
  ARCSINE, U5), by 2% to 19% lower Brier score.
- Pooling across pairs is a real gain in three families and a real loss in one.

**Not shown, or shown false:**
- **General calibration.** False as a general claim: fails the limit in two families.
- **That the pooled prior is the right model.** A per-pair Laplace rule beats it on wide distributions.
- **That any of this changes behaviour.** Task steps were not a criterion here; MBVI3 equals MBVI2.
- Worlds with several destinations per action, calibration after a change, larger worlds: untested.

## Amendment after the outside review (2026-11-14)

The text above is left as first written. From the reconciliation of an outside review against the record
(`research/external/CF03C_CF04_GEMINI_REVIEW_RECONCILIATION.md`):

1. **Where the model's skill comes from**, verified from the Brier decomposition in the result file. Against the
   constant forecaster the advantage is resolution. Against the per-pair Laplace forecaster it is not: the model
   has *lower* resolution than Laplace in every family (U5 0.0059 against 0.0063; WIDE 0.0351 against 0.0399;
   BIMODAL 0.0203 against 0.0210; ARCSINE 0.0484 against 0.0516), and where it wins it wins on reliability.
   Sharing between pairs buys reliability at a small cost in resolution; the trade is a net loss on wide families.
2. **A simpler reading of which families pass** than the one given under "Why it failed": the outcome follows the
   spread of edge reliabilities. The Beta strength matching each family's mean and variance is 56 (HIGH), 8 (U5),
   3.7 (BIMODAL), 2.7 (WIDE) and 2.0 (ARCSINE); the model beats Laplace in the first three and loses in the last
   two, where Laplace's own prior (strength 2) is already nearly right. Five data points; a hypothesis, not a
   result.
3. **Sample size.** The 20 worlds per family were the minimum of the pre-declared rule (the rule gave 6 on the
   development family), not the output of a power calculation for the unseen families.
4. The 0.0553 and 0.0548 quoted for WIDE and ARCSINE are upper interval bounds; the estimates are 0.050 and 0.050.
   The criterion was on the upper bound, so the two failures of K2 are real and marginal. The failures of K3
   (Laplace better) are not marginal.

By the owner's decision of 2026-11-14, world model v3 and its repairs are retained, and calibration claims are
restricted to the environments where evidence supports them: fresh worlds of the development family and BIMODAL.

## Consequences

1. The model keeps its repairs (v3 replaces v2 as the model new work builds on).
2. The claim stays narrow. Any text saying the model "is calibrated" must name the family.
3. Calibration error is dropped as a headline statistic. Brier score with its decomposition, against the constant
   and Laplace forecasters, is the measure from now on.
4. Two candidate repairs are recorded and **not** made here, because they would be tuning after the result: let
   the strength grid include values below 1 so the pooled prior can become weaker than Laplace; and learn the
   impassable-exit weight from data instead of fixing it at 0.05. Either needs its own frozen gate on a new domain.

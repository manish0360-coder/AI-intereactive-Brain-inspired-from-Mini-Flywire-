# M15 — Calibrated Adaptive Belief Tracking and Change Detection: results

**Evidence level.** One run, by the designer, on local commits; development-level, not confirmatory. The hazard
h = 0.01 is development-selected (SPEC.md § Fixed in advance). Written after the run, whatever the outcome. Every figure
is rounded once from the stored full-precision value: tables give the precision printed by
[results/check/describe_m15.out](results/check/describe_m15.out); quotations of the statement keep its 3 decimals.

**Run.** 2026-11-19, 05:09:13Z to 05:17:30Z, at `7baec46` (on top of the freeze `77edfe7`), on the owner's word "Run it":
- `node experiments/m15_uncertainty/run_m15.mjs --domain m15`, exit 0, 387 s;
- labels `m15unc|gate|0..164` (165, none excluded);
- runs A and B identical (digests `ecc1da9f…`);
- suite 224/224 before the run;
- Node v24.15.0, win32-x64;
- result `results/m15_result.json`, SHA-256 `df9e2730…79f7e`.

**Independent check.** [results/check/verify_m15.out](results/check/verify_m15.out): ALL CHECKS PASS (38). It was
written after the freeze and before the run, rehearsed on smoke labels, and catches 16 of 16 mutants. With its own code
it recomputed:
- the provenance;
- the closed-loop rows;
- the passive replay from scratch;
- all 24 criteria with their intervals;
- the four sensitivity blocks;
- BT-COND;
- the verdict lines, and the statement character for character.

## Statement

> POOLED CALIBRATION AND CHANGE DETECTION SHOWN (development-selected h = 0.01), IN CLOSED-LOOP BEHAVIOUR; CALIBRATION
> ACROSS CONDITIONS NOT SHOWN: UA materially underconfident in SPARSE (ECE 0.194); change detection not distinguished
> from a tuned window rule; originally specified h = 0.05 (sensitivity arm): BT parts passed 8 of 9 (failed: BT1); BT1
> pools the no-change conditions (pooled exact ECE 0.074); UA's exact ECE by condition (BT-COND, threshold 0.10): STABLE
> 0.082 [0.082, 0.082] underconfident, PASS; NOISY 0.094 [0.092, 0.097] overconfident, PASS; SPARSE 0.194 [0.194, 0.194]
> underconfident, MATERIAL FAIL; REVERSED before the switch 0.099 [0.098, 0.099] underconfident, PASS; point-weighted
> mean 0.121

The full capability name, "Calibrated Adaptive Belief Tracking and Change Detection", **may not be written**:
calibration across conditions is not shown. This was the development prediction (SPEC.md § Development procedure).

| Line | Reads |
|---|---|
| Validity | **VALID** (determinism, suite, V-REV, CONCRETE passive, no exclusion, frozen beliefs unchanged, probe isolation, identity, all four condition results) |
| Transfer (prerequisite) | **SHOWN** |
| Calibrated belief tracking (pooled; as originally declared) | **SHOWN** |
| Calibration across conditions (BT-COND; added after development results were observed) | **NOT SHOWN** (SPARSE MATERIAL FAIL) |
| Change detection | **SHOWN** |
| Active behaviour | **SHOWN** |
| Bayesian advantage over a tuned window rule | **NOT SHOWN** (MECH-a and MECH-b failed; predicted NOT SHOWN) |

## Criteria

Estimate [95% interval]; for paired parts, the labels for / against / tied.

| Part | Quantity | Result | Passes when | |
|---|---|---|---|---|
| T | STABLE steps: CONCRETE − UA | 30.4314 [29.6481, 31.2136]; 165/0/0 | lower > 0 | pass |
| BT1 | exact ECE, no-change phases (pooled) | 0.0739 [0.0727, 0.0753] | upper < 0.10 | pass |
| BT2a | exact Brier: NEWEST − UA | 0.0835 [0.0801, 0.0869]; 165/0/0 | lower > 0 | pass |
| BT2b | exact ECE: NEWEST − UA | 0.0455 [0.0440, 0.0468] | lower > 0 | pass |
| BT3a | \|mean P(true value) − 0.75\|, NOISY | 0.0549 [0.0494, 0.0604] | upper < 0.10 | pass |
| BT3b | mean P(true value): STABLE − NOISY | 0.1127 [0.1072, 0.1182]; 165/0/0 | lower > 0 | pass |
| BT3c | AUROC, no-change phases | 0.6982 [0.6893, 0.7069] | lower > 0.5 | pass |
| BT4 | exact Brier: UA − FREQ | 0.0039 [0.0033, 0.0045]; 165/0/0 | upper < 0.05 | pass |
| BT5a | overconfidence, SPARSE worlds 1–3 | −0.3958 (no spread) | upper < 0.10 | pass |
| BT5b | overconfidence: NEWEST − UA, SPARSE worlds 1–3 | 0.3958 (no spread) | lower > 0 | pass |
| CD1a | detection delay: FREQ − UA | 4.0000 (no spread); 165/0/0 | lower > 0 | pass |
| CD1b | UA detection rate | 1.0000 (no spread) | lower > 0.75 | pass |
| CD2a | UA false-alarm rate, no-change phases | 0.0033 [0.0022, 0.0044] | upper < 0.10 | pass |
| CD2b | false-alarm rate, NOISY: NEWEST − UA | 0.2188 [0.2106, 0.2274] | lower > 0 | pass |
| CD3a | exact Brier, post-switch observations 3–6: FREQ − UA | 1.0191 [1.0048, 1.0331]; 165/0/0 | lower > 0 | pass |
| CD3b | the same: FROZEN − UA | 1.4356 [1.4316, 1.4397]; 165/0/0 | lower > 0 | pass |
| ACT1a | NOISY steps: UA − CONCRETE | −16.7212 [−17.8341, −15.6095]; 2/163/0 | upper < 8 | pass |
| ACT1b | NOISY steps: NEWEST − UA | 9.1519 [8.3205, 10.0045]; 158/7/0 | lower > 0 | pass |
| ACT2a | post-switch worlds 1–6 steps: FROZEN − UA | 9.1899 [7.8616, 10.4727]; 137/26/2 | lower > 0 | pass |
| ACT2b | post-switch worlds 1–6 steps: FREQ − UA | 7.8465 [6.6616, 9.0101]; 137/27/1 | lower > 0 | pass |
| ACT3 | SPARSE worlds 1–3 steps: UA − CONCRETE | −22.2949 [−24.8202, −19.7778]; 15/149/1 | upper < 8 | pass |
| MECH-a | exact Brier, conditions weighted equally: WINDOW − UA | −0.0046 [−0.0055, −0.0037]; 32/133/0 | lower > 0 | **fail** |
| MECH-b | detection delay: UA − WINDOW | 1.0000 (no spread); 165/0/0 | upper < 1 | **fail** |
| MECH-c | false-alarm rate, no-change phases: WINDOW − UA | 0.0098 [0.0082, 0.0116] | lower > 0 | pass |

## BT-COND: calibration by condition (mandatory results)

BT-COND was added at the pre-freeze review, after development results were observed; it is not part of the original
pre-declaration (SPEC.md § Criteria, BT-COND). BT1 above is unchanged.

| Condition | Exact ECE [95%] | Family lower bound | Direction | Mean confidence | Exact accuracy | Points | Classification |
|---|---|---|---|---|---|---|---|
| STABLE | 0.0824 (no spread) | 0.0824 | underconfident | 0.9176 | 1.0000 | 10,560 | PASS |
| NOISY | 0.0938 [0.0915, 0.0966] | 0.0909 | overconfident | 0.8070 | 0.7426 | 10,560 | PASS |
| SPARSE | 0.1945 (no spread) | 0.1945 | underconfident | 0.8055 | 1.0000 | 10,560 | **MATERIAL FAIL** |
| REVERSED before the switch | 0.0986 [0.0978, 0.0995] | 0.0976 | underconfident | 0.9014 | 1.0000 | 3,988 | PASS |

Pooled (BT1's quantity) 0.0739. The point-weighted mean of the four is 0.1208.

**How the classifications came about:**
- **SPARSE fails materially.** The same deterministic value as at development (0.1945).
- **REVERSED before the switch passes with 0.0005 to spare** (upper bound 0.0995).
- **NOISY passes;** its upper bound is 0.0966.

**What the SPARSE result reflects** (SPEC.md § Pre-freeze review). These are the explanations as stated before the run;
the run adds nothing that separates them:
- **Ruled out, sampling or probe noise:** the value has no spread across labels, because every label sees the same
  exact stream.
- **A minor contributor only, the change layer:** FREQ's SPARSE ECE is 0.1870 (§ Reported metrics).
- **Fully accounted for:** too little evidence under the fixed Dirichlet(½) prior. After 1 to 16 clean observations
  a Jeffreys learner cannot be confident that a relation is exact.
- **Partly a limit of the measure:** the θ*-based ECE scores that uncertainty, which is appropriate for a generic
  prior, against a deterministic truth.
- **A capability limit:** the component cannot learn that relations in this family are exact. This is plausible but
  untested.

## Sensitivity arms (reported, never used to choose)

| Arm | BT parts passed | BT1 (pooled ECE) |
|---|---|---|
| UA, h = 0.01 (primary) | 9 of 9 | 0.0739 [0.0727, 0.0753] |
| **UA_h05, h = 0.05 (the originally specified hazard)** | **8 of 9 (failed: BT1)** | 0.1155 [0.1141, 0.1168] |
| UA_h02, h = 0.02 | 9 of 9 | 0.0859 [0.0845, 0.0874] |
| UA_h15, h = 0.15 | 5 of 9 (failed: BT1, BT2b, BT3a, BT4) | 0.2000 [0.1989, 0.2011] |
| UA_a1, α = 1 | 7 of 9 (failed: BT1, BT2b) | 0.1413 [0.1402, 0.1425] |

- **h = 0.05 by condition:** STABLE 0.1189, NOISY 0.0888, SPARSE 0.2240 and REVERSED before the switch 0.1342, so three
  of four would be MATERIAL FAIL.
- **The original hypothesis, as specified with h = 0.05, fails BT1,** as the design calculation predicted.
- **Not an independent confirmation:** the BT pass at h = 0.01 is a pass of a development-selected configuration.

## Reported metrics (no criterion)

**UA on the route stream, by scope:** expected Brier, mean confidence, exact accuracy, mean P(true value), false-alarm
rate and change uncertainty P(r_t ≤ 3).

| Scope | Brier | Confidence | Accuracy | P(true) | False alarms | P(r_t ≤ 3) |
|---|---|---|---|---|---|---|
| STABLE | 0.0094 | 0.9176 | 1.0000 | 0.9176 | 0.0000 | 0.0152 |
| NOISY | 0.4437 | 0.8070 | 0.7426 | 0.8049 | 0.0111 | 0.0532 |
| SPARSE | 0.0671 | 0.8055 | 1.0000 | 0.8055 | 0.0000 | 0.2008 |
| REVERSED before the switch | 0.0132 | 0.9014 | 1.0000 | 0.9014 | 0.0000 | 0.0154 |
| post-switch observations 1–2 | 1.5978 | 0.8558 | 0.0000 | 0.0741 | 1.0000 | 0.0680 |
| post-switch observations 3–6 | 0.2940 | 0.6384 | 0.7500 | 0.5936 | 0.2500 | 0.3081 |

- **Change uncertainty:** it rises after a switch (0.0680, then 0.3081) and under noise (0.0532 against 0.0152 in
  STABLE).
- **Calibration sensitivity checks (no-change phases):**
  - the empirical (probe) ECE is 0.0740, against 0.0739 exact;
  - equal-mass binning gives 0.0739, and class-wise ECE 0.0369;
  - mean confidence is 0.8543 on correct probes and 0.7959 on incorrect ones;
  - the probe Brier is 0.1554, against 0.1555 exact.
- **Reliability table:** in [`describe_m15.out`](results/check/describe_m15.out) § 5. Its top bins are underconfident
  (0.9–1.0: confidence 0.9189, correctness 0.9768).

**The comparison rules, no-change phases:** exact Brier and exact ECE, with the NOISY ECE beside them.

| Rule | Brier | Pooled ECE | NOISY ECE (direction) |
|---|---|---|---|
| UA | 0.1555 | 0.0739 | 0.0938 (over) |
| FREQ | 0.1516 | 0.0571 | 0.1029 (over) |
| WINDOW w = 2 | 0.1594 | 0.0544 | 0.1137 (over) |
| NEWEST | 0.2388 | 0.1194 | 0.4033 (over) |
| FROZEN | 0.2363 | 0.1494 | 0.1429 (over) |
| ORACLE | 0.1234 | 0.0000 | 0.0000 |

**Detection (route stream), mean delay in observations:**
- UA 3.000, with every kind of every label detected;
- WINDOW (w = 2) 2.000; NEWEST 1.000;
- FREQ and FROZEN 7.000, censored on all 660 kinds;
- h = 0.05 2.000; h = 0.02 2.442; α = 1 3.691.

**The yoked stream (secondary; CONCRETE's own observations).** These figures are kept apart from the route evidence:
41.5% of CONCRETE's observations were detour steps at development, and 39.8% here.

| Rule | No-change Brier | No-change ECE | False alarms | NOISY P(true) | Mean delay | Detection rate |
|---|---|---|---|---|---|---|
| UA | 0.3367 | 0.3035 | 0.0461 | 0.5475 | 4.871 | 0.715 |
| FREQ | 0.3184 | 0.2960 | 0.0178 | 0.5798 | 6.939 | 0.023 |
| WINDOW w = 2 | 0.3701 | 0.1907 | 0.1297 | 0.5257 | 3.303 | 0.886 |
| NEWEST | 0.7886 | 0.3938 | 0.3659 | 0.5378 | 1.371 | 1.000 |

## Closed loop

Mean steps per world:

| Arm | STABLE 1–16 | NOISY 1–16 | Post-switch 1–6 | SPARSE 1–3 | Detour share |
|---|---|---|---|---|---|
| CONCRETE | 34.43 | 34.43 | 35.34 | 34.93 | 0.398 |
| FROZEN | 4.01 | 17.83 | 42.79 | 19.06 | 0.127 |
| FREQ | 4.00 | 17.49 | 41.45 | 13.59 | 0.098 |
| NEWEST | 4.00 | 26.86 | 16.37 | 12.62 | 0.083 |
| WINDOW w = 2 | 4.00 | 19.89 | 28.87 | 13.59 | 0.083 |
| **UA** | 4.00 | 17.71 | 33.60 | 12.64 | 0.078 |
| ORACLE (privileged) | 4.00 | 17.90 | 4.00 | 4.00 | 0.034 |

No episode reached the cap.

**Recovery after the switch, beyond the pre-declared comparisons:**
- **Who recovers faster than UA.** UA recovers sooner than FROZEN and FREQ (ACT2), but NEWEST (16.37) and the tuned
  window (28.87) recover faster than UA (33.60). ACT2 does not compare UA with those two.
- **The window against UA** (reported with MECH):
  - WINDOW − UA is +2.18 [1.58, 2.81] steps under noise: the window is slower;
  - it is −4.73 [−6.14, −3.33] steps after the switch: the window is faster.
- **Under noise,** UA (17.71) is as fast as the oracle reference (17.90) and FREQ (17.49). In NOISY, decoys mislead even
  the true distribution.

## Gate against development

Every estimate stayed close to its development value, and every classification and line outcome was as predicted:

| Part | Development → gate |
|---|---|
| BT1 | 0.0736 → 0.0739 |
| BT3a | 0.0580 → 0.0549 |
| CD3a | 1.0314 → 1.0191 |
| ACT1b | 8.2104 → 9.1519 |
| ACT2a | 11.1167 → 9.1899 |
| ACT2b | 9.7611 → 7.8465 |
| MECH-a | −0.0053 → −0.0046 |
| MECH-c | 0.0072 → 0.0098 |

The full list is in `describe_m15.out` § 9.

## What may be concluded

In the words SPEC.md permits:
- **Pooled tracking (BT, as declared).** Pooled over the no-change phases, UA's exact ECE was 0.0739 [0.0727, 0.0753],
  below the pre-declared 0.10, with a development-selected hazard (h = 0.01).
  - UA beat trusting the newest observation in exact Brier and in pooled ECE; the ECE difference comes from NOISY,
    where NEWEST is badly overconfident.
  - It estimated NOISY reliability at 0.8049 against the true 0.75: an overestimate, within 0.10.
  - Its confidence fell under noise, and separated correct from incorrect probe outcomes (AUROC 0.6982).
  - The change layer cost 0.0039 in exact Brier against counting.
  - It was not overconfident on thin evidence; it was underconfident.
- **Calibration across conditions is not shown.** UA was calibrated within 0.10 in STABLE (underconfident), NOISY
  (overconfident) and REVERSED before the switch (underconfident, narrowly). It was **materially underconfident on thin
  evidence in SPARSE** (ECE 0.1945), which the evidence count under its fixed prior fully accounts for.
- **Change detection.** Every unannounced reversal was detected within 6 observations (3 for every kind of every
  label), far faster than counting (censored at 7). False alarms were rare (0.0033), far rarer than NEWEST's under noise.
  Post-switch probabilities recovered better than FREQ's and FROZEN's.
- **Not distinguished from a tuned window rule.** The window (w = 2) was better in Brier and detected one observation
  sooner, at the cost of more false alarms.
- **In closed-loop behaviour,** acting certainty-equivalently on the belief:
  - under noise the agent was not harmed against the concrete agent (−16.72 steps, against a margin of 8), and it beat
    NEWEST;
  - after a switch it recovered sooner than the frozen and counting agents;
  - on thin evidence it was not harmed.

**What may not be concluded:**
- calibration in each condition, or across STABLE, NOISY, SPARSE and REVERSED;
- the full capability name;
- that UA is better calibrated than NEWEST on thin evidence;
- independent confirmation of the original h = 0.05 hypothesis (which fails BT1);
- Bayesian superiority over a simple rule;
- uncertainty-aware decision-making, confidence-aware exploration or metacognition (decisions use only the ranking of
  the belief);
- any conclusion from the yoked stream about the route evidence;
- anything confirmatory.

**Known qualifications.**
- **Predicted, not discovered.** The inference outcome was largely predicted by the formulas and by development, and
  every line came out as predicted. The run's added information is that the predictions held on fresh labels and in
  closed-loop behaviour.
- **Disclosed changes to the design:**
  - the observation unit takes the first occurrence (D1, decided before any development label);
  - BT-COND and its statement rules were added after development results were observed.
- **Degenerate intervals.** Several parts have none because exact conditions give every label the same stream; their
  values are exact consequences of the rules.

## Files

| File | Role |
|---|---|
| `results/m15_result.json` | The result: provenance, parameters, validity, criteria with per-label values, BT-COND, sensitivity blocks, reported metrics, reading, closed-loop rows |
| `results/run/m15_run.log`, `.stdout`, `.stderr` | Launch and end times, the driver's output (stderr empty) |
| `results/check/verify_m15.mjs`, `.out` | The independent check and its output on the result (38/38) |
| `results/check/rehearse_m15.mjs`, `rehearsal_build.out`, `rehearsal_verify.out`, `mutants_m15.mjs`, `mutants.out` | The check's rehearsal on smoke labels and its mutation test (16/16), before the run |
| `results/check/describe_m15.mjs`, `.out` | The descriptive tables behind this file |
| `results/SHA256SUMS` | SHA-256 of every file above |

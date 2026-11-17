# CF-06 Gate Results — a belief about whether a changed exit will change back

**Verdict: CF-06 SUPPORTED — CONSISTENT.** Over an equal mix of changes that rarely (10%), half the time (50%) or
mostly (90%) reverse, the belief (world model v6, ρ fixed at 1/2, h = 0.01) takes fewer steps than every fixed
re-testing policy in the baseline table. It beats the planner by 84.7 steps a run [55.1, 119.4], 2.4% of the
planner's 3,529, with a typical world gaining +21 steps and 81 of 135 worlds favouring it. Every criterion B1–B6
holds, and by the frozen gainShape rule the gain is CONSISTENT, not carried by a few worlds. It has a cost: where
changes rarely reverse it takes 17.4 more steps than the planner [12.8, 21.9]. That is inside the 25-step margin
(B2), but it is twice the cost the planning scenario assumed.

The gate ran on fresh worlds under the frozen specification. Nothing was tuned or re-run after the outcome. It took
two launches: the first was ended by the machine sleeping and then powering off, before it produced any output (see
**Run history**). **Nothing changes in the agent.** The specification's consequence for this verdict is an
adversarial review, then a proposal to the owner.

| Item | Value |
|---|---|
| Evidence category | Development evaluation gate, not confirmatory (the specification's own classification, line 9): one gate, by the designer, local commits, no independent reproduction. The result file's `evidence` field carries the same words |
| Command | `node experiments/cf06/run_gate.mjs --domain gate6` (exit 0) |
| Code and spec | Freeze commit `7ce1dc6`; `GATE_SPEC.md` SHA-256 `04acec0a842dec52d9dc6d080b8988a04dec1ade105852a9af81547b239adac8` (matches `GATE_SPEC.sha256` and the result's `specSha256`) |
| Recorded head | `7ce1dc6` at launch and at the end; no changed files (`filesClean: true`) |
| Environment | Node v24.15.0, win32-x64; peak resident memory 374,036 KB |
| Result file | `gate6_result.json`, SHA-256 `919875098104331dee54a2c1506dc2fac03ca1293c08badb8ce2fc24b0f972ac`; row hash `cddb668b45be811d3d90f4c5a40708a140e7f2c5923a0c446cce5ced2fa87c2e` |
| Worlds | `cf|gate6|world|0…134` (24 nodes, 30 edges, maximum degree 4); **0 excluded, 135 analysed** (none can be excluded at this size, as the specification states) |
| Reproducibility | Two in-process runs gave identical row hashes; `npm test` 173/173 inside the run; 0 capped episodes for the primary |
| Run time | 5 h 0 min 40 s (run A 9,659 s, run B 6,792 s of arm time, plus the battery and tests) |

## Run history (disclosed)

| Step | When (UTC) | State | What happened | Output seen |
|---|---|---|---|---|
| Refusal checks | 2026-11-16 14:11:37 and 14:11:48 | before the freeze commit | The driver refused twice, as it must: the hash file was missing, then the files were not committed (`run/gate6_refusal_checks.log`) | refusal messages only |
| Attempt 1 | 2026-11-16 14:12:45 | `7ce1dc6`, clean tree | The laptop went into standby at about 16:07 (21:37 local), because the desktop app's keep-awake hold lapses when the session is idle. It woke at about 00:42 on 11-17, and the system powered it off at 01:17:55. The process ended with the machine (`run/gate6_attempt1.log`) | **none.** The driver writes its result and its only stdout line after both runs (`run_gate.mjs` lines 462–463), and no result file existed |
| Attempt 2 | 2026-11-17 03:46:35 | `7ce1dc6`, clean tree | Relaunched on the owner's word ("try again"), detached from the session, with a per-process Windows wake request held for the run's lifetime (`SetThreadExecutionState`; no setting changed; `run/run_gate6_awake.ps1`, `run/hold_awake_until.ps1`) | exit 0 at 08:47:15; stderr empty; stdout in `run/gate6_attempt2.stdout` |

Frozen limitation 16 says that "a failed run cannot be resumed (the domain is spent once started)". Attempt 2 is not
a resumption. It is a restart from nothing, of the same commit, after a failure that produced no output:

- the run is deterministic: worlds, schedules, environment streams and agent streams come from their labels alone,
  and the two in-process runs must give identical rows;
- so attempt 2 computes exactly the rows attempt 1 would have computed;
- no result of attempt 1 was seen, and nothing changed between the attempts.

This record therefore reads limitation 16 as "spent once any result has been observed". That reading is the owner's
decision ("try again"), not something the specification says. It is stated here so that it can be challenged.

## Criteria

Steps over the change phase of a run; mean [95% interval] over 135 worlds, paired by world, 10,000 resamples; median;
how many worlds favour BELIEF / the comparator / neither.

| Criterion | Statistic | Result | Median | BELIEF better / worse / equal | Held |
|---|---|---|---|---|---|
| **B1** vs the planner | MBVI3 − BELIEF, sum over RARE + HALF + OFTEN | **+84.7 [55.1, 119.4]** | +21 | 81 / 53 / 1 | yes |
| B1 vs RECALL h = 0.003 | RECALL_003 − BELIEF, mix | +94.2 [77.4, 110.9] | +81 | 118 / 16 / 1 | yes |
| B1 vs RECALL h = 0.01 | RECALL_01 − BELIEF, mix | +350.5 [303.3, 402.6] | +288 | 128 / 5 / 2 | yes |
| B1 vs RECALL h = 0.03 | RECALL_03 − BELIEF, mix | +1,283.3 [985.4, 1,639.4] | +787 | 134 / 0 / 1 | yes |
| **B2** safe where re-testing hurts | RARE: BELIEF − MBVI3; upper bound < 25 | **+17.4 [12.8, 21.9]** | +21 | 23 / 107 / 5 | yes (3.1 steps to spare) |
| **B3** helps where changes reverse | OFTEN: MBVI3 − BELIEF | **+60.7 [43.6, 79.9]** | +12 | 81 / 35 / 19 | yes |
| **B4a** recovers reopened routes | OFTEN, steps after reversed events, MBVI3 − BELIEF | +43.6 [32.3, 55.8] | +15 | 90 / 17 / 28 | yes |
| **B4b** gives up from evidence | RARE, futile re-tests, RECALL_01 − BELIEF | +111.4 [99.7, 123.7] | +106 | 133 / 0 / 2 | yes |
| **B5** no regression | BELIEF − MBVI3 on E1 EXPLORED / E3 / E1S EXPLORED / E2P PRE; upper bounds < 10 | 0.0 / 0.0 / +0.01 [0.00, 0.02] / 0.0 | 0 | identical in 135 / 135 / 134 / 135 worlds | yes |
| **B6** infrastructure | Two runs identical; all tests pass | identical; 173/173 | — | — | yes |

RECALL h = 0.03 hits the 200-step cap in 332 episodes (245 in RARE, 87 in HALF). Each one counts as 200 steps, so
the cap understates its cost. RECALL h = 0.01 has 3 capped episodes, the real-only diagnostic arm 1, and every other
arm none.

## gainShape (part of the verdict line)

The rule is the same for each B1 part and B3. **CONSISTENT** requires:

- (i) more worlds in favour than against;
- (ii) a positive median;
- (iii) a positive mean once the most favourable ⌈0.1 × 135⌉ = 14 worlds are removed.

| Part | In favour / against / tied | Median | Mean without the top 14 | Top 14's share of the summed difference | Fewest favourable worlds whose removal erases the mean | Shape |
|---|---|---|---|---|---|---|
| B1 vs MBVI3 | 81 / 53 / 1 | +21 | +36.6 | 0.61 | 39 | holds |
| B1 vs RECALL_003 | 118 / 16 / 1 | +81 | +71.3 | 0.32 | 90 | holds |
| B1 vs RECALL_01 | 128 / 5 / 2 | +288 | +279.9 | 0.28 | 120 | holds |
| B1 vs RECALL_03 | 134 / 0 / 1 | +787 | +765.6 | 0.47 | 134 | holds |
| B3 (OFTEN) | 81 / 35 / 19 | +12 | +32.6 | 0.52 | 52 | holds |

**Reading, against the planner.** The gain has a limited downside and a long upside:

- **Worst worlds:** 16 (−108), 50 (−102), 12 (−69), 69 (−66), 1 (−63).
- **Best worlds:** 68 (+1,170), 51 (+983), 39 (+954), 52 (+560), 100 (+529).
- **Quantiles:** q10 −45, q25 −27.5, median +21, q75 +143, q90 +244.

The 14 most favourable worlds carry 61% of the summed difference. Even so, the other 121 worlds still average +36.6,
and 39 favourable worlds would have to be removed before the mean fell to zero.

The shape is CONSISTENT by the rule. The typical world's gain is still small: the median of +21 steps is 0.6% of the
planner's total. Most of the mean comes from avoiding long failures in a minority of worlds.

## Steps per arm

Mean steps over the change phase of a run (lower is better). The mix column is the per-world sum of the three
families, with its median in parentheses.

| Arm | RARE (ρ 0.1) | HALF (ρ 0.5) | OFTEN (ρ 0.9) | Mix (median) |
|---|---|---|---|---|
| ORACLE (privileged) | 1,262.2 | 1,023.5 | 832.7 | 3,118.3 (3,136) |
| MBVI3 (the planner) | 1,338.6 | 1,171.5 | 1,019.3 | 3,529.4 (3,525) |
| RECALL h = 0.003 | 1,430.1 | 1,152.7 | 956.1 | 3,539.0 (3,532) |
| RECALL h = 0.01 | 1,622.4 | 1,213.7 | 959.1 | 3,795.2 (3,733) |
| RECALL h = 0.03 | 2,255.2 | 1,475.3 | 997.5 | 4,728.0 (4,271) |
| **BELIEF (primary)** | **1,356.0** | **1,130.0** | **958.6** | **3,444.7 (3,441)** |
| VOL (ρ learned) | 1,349.1 | 1,132.1 | 952.2 | 3,433.4 (3,409) |
| VOL_RHO_TRUE (privileged: told ρ) | 1,341.1 | 1,130.0 | 941.7 | 3,412.8 (3,409) |
| BELIEF_REALONLY (diagnostic) | 1,360.5 | 1,139.6 | 971.9 | 3,472.1 (3,460) |
| BELIEF_FALSEONLY (diagnostic) | 1,334.7 | 1,161.3 | 1,007.8 | 3,503.7 (3,509) |
| BELIEF h = 0.003 (sensitivity) | 1,358.9 | 1,139.2 | 970.0 | 3,468.2 (3,427) |
| BELIEF h = 0.03 (sensitivity) | 1,353.8 | 1,151.1 | 988.1 | 3,493.1 (3,457) |

- **Gap to the privileged reference.** The planner is 411.1 steps from the oracle on the mix. BELIEF closes 84.7
  steps of that gap (21%), VOL 96.0 (23%) and the true-rate reference 116.6 (28%).
- **No fixed policy is best in every family.** RECALL 0.003 is cheaper than BELIEF in OFTEN (956.1 against 958.6).
  The planner is cheaper in RARE.
- **Futile re-tests in RARE, per run:** planner 14.2, BELIEF 21.8, VOL 18.8, RECALL h = 0.01 133.2.
- **Steps after reversed events in OFTEN:** planner 442.0, BELIEF 398.4, RECALL h = 0.01 379.4, true-rate reference
  371.7, oracle 321.6. As frozen limitation 8 expected, RECALL at the same h recovers faster where 90% of changes
  reverse, because ρ = 1/2 under-weights reversal there.
- **Cost of computation.** Value-iteration work per decision is 6.5–7.4% above the planner's (for example RARE 1,233
  against 1,155). BELIEF's arm time in run A was 801 s against 690 s.

## Where the gain comes from (privileged diagnostic arms)

All figures below are MBVI3 − arm; positive means fewer steps than the planner. BELIEF_REALONLY is the primary
archiving only genuine changes, and BELIEF_FALSEONLY archives only the detector's false alarms. Both are classified by
the live ground-truth predicate. No ordinary arm receives that predicate.

| Family | BELIEF | Genuine changes (REALONLY) | … reversed events' windows | … permanent events' windows | After reversed events alone | False alarms (FALSEONLY) | Residual |
|---|---|---|---|---|---|---|---|
| RARE | −17.4 [−21.8, −12.8] | −21.8 [−26.6, −17.1] | +0.9 [−0.8, 2.8] | **−22.7 [−27.0, −18.7]** | +3.4 [1.6, 5.3] | +4.0 [1.1, 7.2] | +0.5 [−2.6, 3.6] |
| HALF | +41.4 [24.9, 60.7] | +31.8 [18.3, 47.2] | +28.3 [18.2, 40.1] | +3.5 [−1.9, 9.6] | +26.6 [20.1, 34.0] | +10.2 [3.5, 19.9] | −0.6 [−3.8, 3.3] |
| OFTEN | +60.7 [43.7, 80.2] | **+47.4 [32.5, 63.2]** | +44.3 [29.9, 59.8] | +3.1 [0.4, 6.3] | **+37.7 [27.7, 48.9]** | **+11.5 [4.4, 20.7]** | +1.8 [−3.9, 8.6] |
| **Mix** | **+84.7 [55.1, 119.4]** | **+57.3 [34.4, 83.4]** | — | — | — | **+25.7 [11.3, 45.8]** | +1.7 [−5.4, 9.8] |

(The bootstrap here draws its own resamples, so BELIEF's interval differs in the last digit from the criteria table.)

- **The split is exact** (`splitExact: true`). Judged by the trace classifier, the real-only arm archived no false
  alarm and the false-only arm no genuine change.
- **gainSource (OFTEN): GENUINE REVERSALS AND FALSE-ALARM REPAIR.** The record may say that the belief **recovers
  reopened routes**. As the rule requires, it must also say that **the gain includes repairing the change detector's
  false alarms**: +11.5 of the +60.7 in OFTEN.
- **gainSourceMix: GENUINE REVERSALS AND FALSE-ALARM REPAIR.** The record may say that B1's advantage over the planner
  comes from recovering reopened routes, and must say that about 30% of it comes from false-alarm repair: genuine
  changes +57.3 (68%), false alarms +25.7 (30%), residual +1.7 (2%). The development look had suggested the opposite,
  that the mix gain was mostly false-alarm repair; the gate did not repeat it.
- **The RARE cost is the belief's handling of permanent changes** (−22.7). Repairing false alarms pays back only
  +4.0 of it.

**Archives and confirmations per run (BELIEF).** "Confirmed" means BELIEF's own confirmation that an archived exit
works again.

| Family | Genuine, reversing | Genuine, permanent | False alarms (before the first change) | Share of archives that are false | Confirmed: genuine / false | Share of confirmations that are false |
|---|---|---|---|---|---|---|
| RARE | 0.46 | 4.81 | 1.11 (0.28) | 17% | 0.24 / 1.01 | **81%** |
| HALF | 2.21 | 2.27 | 0.96 (0.28) | 18% | 1.35 / 0.82 | 38% |
| OFTEN | 2.76 | 0.41 | 0.87 (0.28) | 21% | 1.47 / 0.73 | 33% |

The agent's own confirmation is not evidence of a genuine reversal. In RARE, four of five confirmations are of exits
that were not blocked when the change was declared.

**Confirmation split** (reported only; it conditions on the agent's behaviour):

| OFTEN, MBVI3 − BELIEF | Worlds | Result |
|---|---|---|
| BELIEF confirmed no false alarm | 60 | +36.7 [21.2, 53.4] |
| BELIEF confirmed a false alarm | 75 | +79.9 [52.7, 110.9] |

BELIEF also crosses reopened edges more often than the planner in its after-windows: +4.9 [3.6, 6.4] crossings per
run in OFTEN and +4.7 [3.6, 5.9] in HALF.

## Claim rules (reported beside the verdict; they never change it)

| Claim | Statistic | Result | May be written |
|---|---|---|---|
| L1 "Learning the rate adds value" | BELIEF − VOL, mix; every family lower bound > −25 | +11.3 [0.3, 22.8]. By family: RARE +6.9 [4.4, 9.6], HALF −2.0 [−8.7, 4.1], OFTEN +6.4 [−2.0, 15.6] | **yes**, by its rule; lower bound 0.29 |
| L2 "Knowing the rate has measurable value on E5" | BELIEF − VOL_RHO_TRUE, mix; lower bound > 0 | +31.9 [21.7, 42.7] | **yes** |
| "This task can test learning the rate" | L2, and the headroom mean ≥ 2 × L1's MDE80 | 31.9 against 2 × 16.1 = 32.3 | **no**: missed by 0.4 steps |
| L3 "VOL's learned rate moves in the right direction" | VOL's final ρ, OFTEN − RARE | +0.32 [0.29, 0.34] (130 / 4 / 1) | **yes**. Never "estimates the rate" |
| L4 "VOL learns to stop re-testing where changes never reverse" | 64 zero-reversal RARE worlds, VOL − BELIEF futile re-tests: in total; in events 4–6 | −4.0 [−5.2, −2.8]; −2.6 [−3.8, −1.5] | **yes** |
| h-robustness | B1 at h = 0.003, 0.01 and 0.03 | holds at all three | **ROBUST** |
| Weighting | B1 over 66 weightings (0.1 grid) | holds on 50 | — |

**Learning the rate, read together.** Two conclusions follow from these rows:

- **Learning helps a little.** VOL beats the primary on the mix, mostly in RARE: its ρ falls (median 0.34) and it
  re-tests less.
- **E5 at n = 135 is not admitted as a test of learning the rate.** The headroom rule fails by 0.4 steps, so H-VOL
  stays not admitted by this task. L1 passed under its own rule, but its lower bound, +0.29, sits at the edge of what
  135 worlds can detect, and the contrast is uncorrected.

The result also bears on the design choice: the primary, ρ fixed at 1/2, is not the cheapest arm in this run. VOL is
11.3 steps cheaper, and the privileged true-rate reference 31.9. Neither result can change the verdict or the
specification's consequence, which names ρ fixed at 1/2.

**VOL's ρ.**

| | RARE | HALF | OFTEN |
|---|---|---|---|
| True ρ | 0.1 | 0.5 | 0.9 |
| VOL's final ρ, median | 0.34 | 0.54 | 0.70 |

The correlation of VOL's final ρ with the realised share of reversals is 0.72 pooled over families (0.30–0.48 within
a family).

**Weighting.** B1 fails (some part's lower bound ≤ 0) on 16 weightings (RARE / HALF / OFTEN):

- **Against the planner, on 11 weightings:**
  - every weighting with RARE at 0.7 or more: 0.7/0/0.3, 0.7/0.1/0.2, 0.7/0.2/0.1, 0.7/0.3/0, all three at 0.8,
    both at 0.9, and 1/0/0;
  - also 0.6/0.4/0.
- **Against RECALL h = 0.003 or 0.01, on 5 weightings where OFTEN dominates:** 0/0/1, 0/0.1/0.9, 0/0.2/0.8, 0/0.3/0.7,
  0.1/0/0.9.

In 8 of the 16 weightings some part's mean is also ≤ 0. They are the extremes: RARE 0.8 or more, or OFTEN 0.9 or
more with no weight on RARE.

The belief beats every fixed policy when the mix of permanent and reversing changes is uncertain. An agent that knew
nothing reverses would do better as the planner. An agent that knew nearly everything reverses would do as well or
better with a slow clock.

## Sensitivity to h (reported; the verdict uses h = 0.01 only)

| Statistic | h = 0.003 | h = 0.01 (primary) | h = 0.03 |
|---|---|---|---|
| Mix, arm − BELIEF | +23.5 [12.1, 35.3] | 0 | +48.4 [33.3, 63.7] |
| B1 vs planner (median; for / against) | +61.2 [32.2, 95.6] (+1; 69 / 65) | +84.7 [55.1, 119.4] (+21; 81 / 53) | +36.3 [9.1, 67.5] (**−20; 54 / 80**) |
| B2, RARE: arm − MBVI3 | +20.3 [15.5, **25.1**] | +17.4 [12.8, 21.9] | +15.2 [9.7, 20.5] |
| B3, OFTEN (median; for / against) | +49.3 [33.4, 66.8] (+6) | +60.7 [43.6, 79.9] (+12) | +31.2 [16.5, 48.4] (0; 59 / 58) |

B1 holds at all three values of h. The rest of the verdict does not:

- **At h = 0.003**, B2's upper bound is 25.1. That is above the 25-step margin, so B2 would fail.
- **At h = 0.03**, more worlds favour the planner than BELIEF on the mix, and the median is negative, so gainShape
  could not read CONSISTENT.

The verdict's two strongest features hold only at h = 0.01: B2 holding, and the gain being CONSISTENT. h = 0.01 was
not tuned on E5. It was borrowed from CF-05b, where it was chosen for RECALL (frozen limitation 9). Of the three
values tried, it is also the cheapest.

## The frozen limitations, checked against the gate

| Limitation (development figure) | Gate figure | Reading |
|---|---|---|
| 1, 2: power sized for half the development effect | B1 vs planner +84.7 (dev +64.1); B3 +60.7 (+45.6); B4a +43.6 (+27.7); B4b +111.4 (+93.2) | Fresh-world effects are larger than development, not smaller. The simulation put P(CONSISTENT) at about 0.5 at the development effect |
| 3: the gain over the planner is concentrated (10 of 20 worlds against; median −5) | 53 of 135 against; median +21; 39 worlds to erase the mean | Less concentrated than on development; the top 10% still carry 61% |
| 4: against the planner the gain is largely detector repair (false alarms +48.0, genuine +28.9) | genuine +57.3 [34.4, 83.4], false alarms +25.7 [11.3, 45.8] | Not repeated: two-thirds of the gain comes from genuine changes |
| 5: B2 is a balance (genuine cost −9.8, false-alarm repair +11.3) | genuine −21.8, false-alarm repair +4.0, net −17.4 | **Not a balance on fresh worlds**: the cost of permanent changes is 2.2 times the development figure. B2 holds with 3.1 steps to spare |
| 8: knowing the rate +14.5; learning it +4.4 | +31.9; +11.3 | Both larger; still short of the headroom rule |
| 9: B1 fails at h = 0.03 on development | B1 holds at all three h | ROBUST for B1 (see the h table for B2 and the gain's shape) |
| 11: B1 on 26 of 66 weightings | 50 of 66 | Broader |
| 12: in RARE 74% of confirmed reversals are false alarms | 81% | Confirmed |
| 13: where nothing reverses the belief costs +8.2 against the planner | +20.1 [14.5, 25.4] on the 64 zero-reversal RARE worlds (55 of 64 cost more) | **Larger**: not "a little" |
| 14: B5 cannot fail on these tasks | identical in all but one world-cell | Confirmed: the extension is inert there |

## What this shows, and what it does not

**Shown, on 135 fresh 24-node worlds**:

- A belief about each changed exit beats every fixed willingness to re-test over an equal mix of reversal rates. The
  belief remembers the exit's old regime and treats failed re-tests as evidence about whether it will change back.
  The four fixed policies are the planner's reset and RECALL at three hazards.
- Against the planner the gain is 2.4% of the steps (median 0.6%), and it is CONSISTENT by the frozen rule.
- Where changes mostly reverse, it recovers reopened routes: genuine changes carry +47.4 of the +60.7 in OFTEN.
  Repairing the detector's false alarms carries +11.5.
- Where changes rarely reverse, it gives up from evidence: 111 fewer futile re-tests than a clock with the same h.
- It changes nothing on the four unchanged tasks.

**Not shown:**

- **That it is better in every environment.** It loses to the planner when most changes are permanent: 17.4 steps a
  run in RARE, and 20.1 where nothing reverses. B1 fails on weightings with RARE at 0.7 or more.
- **That ρ = 1/2 is the right form.** VOL, which learns ρ, is 11.3 steps cheaper on the mix (uncorrected; lower bound
  0.29). E5 is still not admitted as a test of learning the rate.
- **That the gain's shape and B2's pass survive another h.** Both hold at h = 0.01 only.
- **That the gain is independent of the change detector.** 30% of the mix gain repairs its false alarms. A better
  detector would change the comparison; that question is not tested.
- **Anything beyond E5's scope** (frozen limitation 15): one kind of change, a fixed 10-episode delay, three reversal
  rates, six changes a run, 24-node worlds, one environment class.
- **Anything confirmatory.** This is one development gate, run by the designer, on local commits, with no independent
  reproduction, and it took two launches (disclosed above).

## Consequence (fixed in the specification before the run)

**SUPPORTED — CONSISTENT:** adversarial review, then a proposal to the owner to make model v6 with ρ fixed at 1/2 the
agent's model. Nothing changes in the agent before that decision.

Not pushed.

## Files

| File | What it is |
|---|---|
| `gate6_result.json` | The driver's output: parameters, criteria, claims, the full analysis and every row of run A (SHA-256 above) |
| `run/gate6_refusal_checks.log` | The two refusals before the freeze commit |
| `run/gate6_attempt1.log` | Attempt 1's launch line; nothing else was produced |
| `run/gate6_attempt2.log`, `run/gate6_attempt2.stdout` | Attempt 2's launch, process id and exit lines, and the driver's stdout (stderr was empty, 0 bytes) |
| `run/run_gate6_awake.ps1`, `run/hold_awake_until.ps1` | The launch wrapper and the wake-request holder used for attempt 2 |

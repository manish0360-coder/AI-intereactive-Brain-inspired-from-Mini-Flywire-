# CF-06 pre-freeze reconciliation — the owner's corrections against the source

**Status.** Working record for the owner's review, 2026-11-15. Nothing in it is committed. The specification is
still a draft (`GATE_SPEC.md`, revision 2); the `gate6` domain has not been run; no frozen file was edited (checked:
`git diff` is empty for `experiments/cf03b … cf05b` and `research/`; CF-05b spec SHA-256 `154dd7f7…` and result
`689f84e0…` unchanged).

## 0. Which review was reconciled

The file supplied as Gemini's CF-06 review (`Downloads/gemini_Review-.txt`) is **byte-identical** to the CF-05 /
CF-05b review already lodged (`research/external/CF05_CF05B_GEMINI_REVIEW.md`, SHA-256 `8f9d8635377fa2d4…`). It does
not mention CF-06, task E5, model v6, VOL or ρ, so it is not a review of this draft. What follows reconciles the
**eight corrections in the owner's decision**, taken as the substance of the review, against the code and data.
The actual CF-06 review text is still needed: to lodge it verbatim and to check it for points outside the eight.

## 1. The eight points

| # | Point | Verdict | Evidence in the source | What was done (draft only) |
|---|---|---|---|---|
| 1 | No fixed-ρ = 0.5 control | **Valid, and the most important.** | The draft's arms (`run_gate.mjs`, `ARMS`) had no arm with v6's belief but an unlearned ρ. VOL's gain over the fixed policies could come from the two-regime Bayesian belief (failed re-tests counted as evidence) rather than from learning ρ. My own bundle asked this (question 6) but the draft did not act on it. | Arm `VOL_FIXED05` (same model, belief, seeds, environment, planner budget; ρ fixed at 1/2 = the prior mean). New criterion **V7** and a new verdict **BELIEF, NOT LEARNING** (V1 holds, V7 fails). Test: the two arms take identical decisions until VOL's ρ first leaves 1/2. **Dev: control − VOL +4.4 [−12.0, 23.6]; the control alone beats all four fixed policies. The gain is the belief, not the learning** |
| 2 | False-alarm diagnostics | **Valid.** The draft declared the bias (a false alarm, once it moves again, counts as a confirmed reversal and pushes ρ up) but did not measure it. No leakage existed to fix: VOL receives observations only. | `world_model.mjs` header ("Known limit"); no ground-truth comparison anywhere in the driver. | The v6 model keeps an event log of its own archive openings and confirmations (`eventLog()`, step-stamped; the model never reads it). `diagnoseE5` in the task compares it with the schedule **after the agent's last step**: real vs false archives, real vs false confirmations, changes detected, ρ at each detection. Tests: hand-built trace with known answers; shifted-log and confirm-without-open mutants refused; static check that the trace is read once, after the last episode |
| 3 | h sensitivity | **Valid.** h = 0.01 was CF-05b's selection for a different mechanism (RECALL) on its own tuning worlds; the draft disclosed this but tested nothing else. | `WM6_DEFAULTS.volHazard`; draft "Things to doubt" 4. | Arms `VOL_H003`, `VOL_H03`. Reported only; the verdict uses h = 0.01 (fixed before any data). Pre-declared label **ROBUST / DIRECTION ROBUST / SENSITIVE TO h**. No h is chosen from any result |
| 4 | Zero-reversal degeneration | **Valid, and sharper than stated.** Two properties of v6 make it real (now stated in the model header and tested): (a) an exit never re-tested gives no evidence, so with every open archive untested the fixed point is **ρ = 1/2 whatever the number of changes** — ρ falls only through failed re-tests, which cost steps; (b) with Beta(1, 1) and six permanent changes ρ cannot fall below 1/8 even with perfect evidence. | `regimeBelief` with k = 0 gives L_rev = L_perm = 1; the fixed point of ρ = (1 + nρ)/(2 + n) is 1/2. | RARE worlds whose six changes were all permanent are analysed separately: futile re-tests per event (own edge after its block window; earlier permanent edges), ρ at each detection, final ρ quantiles, VOL against the control and the planner. **Claim rule fixed now:** "VOL learns to stop re-testing where changes never reverse" may be written only if VOL's futile re-tests are below the control's in total and in events 4–6 (both upper bounds < 0) |
| 5 | Audits (power, weighting, overlap, fairness, leakage) | **Partially valid.** Weighting dependence and power were real gaps; overlap was already disclosed; no leakage was found. | See §2 | Weighting grid (66 points); power recomputed for every criterion; leakage list in §2.5 |
| 6 | Can six changes support "learning the rate"? | **Valid, and the evidence goes further.** Six changes support a claim about **direction** only. More decisive: in E5 even perfect knowledge of the rate is worth less than one detectable effect, so the task cannot test whether learning it pays. | §3 | V4 is stated as an ordering test only; quantiles, per-world ordering, ρ by realised number of reversals, correlation with the realised share, and the ideal-observer bound are reported |
| 7 | Keep 24 nodes / 30 edges | **Agreed; no change needed.** The draft never had a 48-node arm. | `parameters.world` in the driver | None |
| 8 | Drifting volatility, unfamiliar reversal distributions | **Agreed: future questions.** Neither can be tested inside CF-06 without a new task family, which would need its own admission evidence. | E5 holds ρ fixed per family and reverses after exactly 10 episodes | Recorded in `docs/experiments/HYPOTHESIS_REGISTRY.md` as H-VOL-DRIFT, H-VOL-CONT, H-VOL-XFER (uncommitted) |

## 2. Audits

### 2.1 Power

Revision 1's figures were right as arithmetic (V1 against the planner: smallest detectable effect 49 at n = 60
against a dev effect of 68.5, so P(pass) ≈ 0.98 if the dev effect is true; it is one 20-world estimate with interval
[13.8, 130.1], and at half that effect the power is about 0.5). What revision 1 could not show is the power of the
question that matters, V7: at the dev effect +4.4 (SD 42.0) P(pass) ≈ 0.12, and 80% would need about 700 worlds. The
full table is in the specification; P(BELIEF, NOT LEARNING) ≈ 0.85. Within-world dependence of the three families is
handled correctly (contrasts are formed per world, the world is resampled).

### 2.2 Family weighting

The equal mix is one point of the weight simplex. It is defensible as the uninformative weighting of three designer-
chosen families, but not privileged: at pure RARE no re-testing policy can beat the planner (V1 against MBVI3 must
fail there), and at pure OFTEN RECALL 0.01 is the strongest fixed policy. The driver now reports every weighting on
a 0.1 grid (66 points) for the four fixed policies and the control. The verdict still uses the equal mix (fixed now);
the grid shows how much of the simplex the conclusion covers.

### 2.3 Development / validation overlap

Correct as disclosed: the 8-world driver validation reused dev worlds 0–7, which were among the 20 dev worlds of the
VOL look, so it is not independent evidence. The gate domain is untouched: no source, script or result in the
repository uses `cf|gate6|` world labels (searched). Revision 2 adds one more look at dev worlds 0–19 (the new arms);
it is disclosed in the specification, and no constant was changed after it.

### 2.4 Baseline fairness

| Item | Status |
|---|---|
| Same worlds, schedules, environment streams and agent seed labels for every arm | Yes (`runE5`: `${world}|E5|env`, `${world}|E5|agent`; schedule from the true graph only) |
| Same planner budget | VI budget 100 for MBVI3, RECALL, VOL and its variants; work per decision is reported |
| Control is the same model with only ρ unlearned | Yes; tested to act identically while the beliefs agree |
| Fixed policies span the re-testing range | The planner and three RECALL hazards; plus the control. RECALL uses the v4 planner hook (more work per decision, reported). **Correction:** the draft called MBVI3 "never re-tests"; it does (22.9 futile re-tests per RARE run on dev), because v3 forgets a changed exit's destination (`world_model.mjs:159`) and the planner is optimistic about the unknown. Label corrected; V2 compares against a planner that already re-tests at a floor |
| Asymmetry disclosed | VOL is compared with five fixed policies chosen by the designer; "best fixed policy per family" is read off post hoc and is optimistic for the fixed side |

### 2.5 Information leakage

| Channel | Finding |
|---|---|
| What an agent is built with | `makeAgent(kind, env, label, params)`; the registry hands the agent only `{ rng, params }` (oracle only to ORACLE, CF-01 rule; tested) |
| Parameters | VOL: none from the task. VOL_FIXED05: the constant 1/2. **VOL_RHO_TRUE: the family's true p — privileged by design**, labelled, in no criterion |
| Schedule | Drawn from the true graph only, before the run; never passed to an agent |
| Diagnostics | Computed in `runE5` after the agent's last step, from one read of the environment trace; the agent source contains no reference to them (static test) |
| v6 event log | Written by the model from its own observations, read only by evaluation code |
| Same agent seed across families | Intended (common random numbers); differences are paired by world |
| `gate6` labels | Unused anywhere before the gate |

### 2.6 Defects found in this pass that the review did not name

1. **A criterion on an empty contrast would have passed.** In the draft driver `C.V2….hi < MARGIN` and the battery
   check compare a `null` bound, and in JavaScript `null < 25` is true. Repaired: `lbPos` / `ubBelow` require n > 0.
2. **Empirical-Bayes self-influence.** ρ includes each archive's own evidence (no leave-one-out), so during the first
   change VOL already differs from the control through that change's own failed re-tests. Not changed (it is the
   specified estimator); disclosed, and the driver reports control − VOL separately for events 1–3 and 4–6, so
   learning **across** changes shows as a gap that grows with the event index.
3. **Failed re-tests soon after a change carry almost no evidence** (S(τ) ≈ 1 for τ ≪ 1/h). ρ moves only on re-tests
   made long after the change. Disclosed.
4. **The zero-reversal claim rule first accepted a single world** (a one-world bootstrap interval is a point). It now
   needs at least 10 such worlds.
5. **The planner's label** (above, §2.4).

## 3. Can six changes per run support the learning claim?

**No — but not mainly for the reason the correction anticipated.** Six changes do let ρ move, in the right
direction: V4 holds in 20 of 20 dev worlds, and in worlds where nothing reverses VOL's ρ at each new change falls
steadily (0.58 → 0.33, lower in 10 of 10). They do not let it be estimated: ρ moves about half as far from 1/2 as an
ideal observer would (0.31 vs 0.13 with no reversal, 0.68 vs 0.88 with six), and the families overlap world by
world (RARE < HALF < OFTEN in 11 of 20). In RARE three of four confirmed reversals are false alarms of the change
detector, so ρ there measures the detector as much as the world.

The decisive problem is different: **in E5, knowing the rate is worth almost nothing.** An agent told the true rate
beats the ρ = 1/2 control by only +14.5 [−8.2, 42.4] steps on the mix (RARE +0.6, HALF 0, OFTEN +13.9), less than the
smallest effect 60 worlds can detect (22). Each changed exit's own failed re-tests settle it within one or two tries,
and in RARE the planner's own optimism already sets the re-testing floor (VOL 15.8, control 17.6, planner 15.4 futile
re-tests in the zero-reversal worlds), so there is nothing for a learned rate to save. More changes per run would
sharpen ρ but would not create value for it. **What E5 does test, with high power, is the belief:** the control alone
beats all four fixed policies on the mix (weakest part +64.1 [11.6, 123.3]).

## 4. Development run of revision 2

Full tables in the specification (development disclosure). Verdict the driver would give on dev: **BELIEF, NOT
LEARNING** (V1–V5 hold; V7 +4.4 [−12.0, 23.6]). h-robustness DIRECTION ROBUST (V1 not certain at h = 0.03). The
zero-reversal claim not shown. Weighting: V1 holds on 32 of 66 grid points. Determinism and 168/168 tests held.

## 5. Recommendation

The corrected draft is sound as a measurement: it would report correctly whatever happens. But the development
evidence predicts its outcome with unusual confidence (P ≈ 0.85 BELIEF, NOT LEARNING), and the learning half of that
outcome would be uninformative, because the task gives the learned quantity no measurable value. Running it as the
H-VOL gate would spend a fresh domain to learn something we already know from dev and could not have learned
otherwise.

**Recommended: do not freeze revision 2 as the test of learning the rate. Re-scope CF-06 to the claim E5 can test,
and move rate-learning to a task built so that the rate matters.**

| Option | What it tests | Expected result | Cost |
|---|---|---|---|
| **A (recommended). CF-06 re-scoped: the belief** | "A two-regime belief per changed exit, updated by failed re-tests, beats every fixed willingness to re-test." Primary arm the simpler mechanism (v6 with ρ fixed at 1/2, no learning); VOL, the true-rate reference and V7 reported, with the headroom stated | V1–V5 likely hold (P ≈ 0.96 for the weakest part); a clean, positive, minimal claim | Rewrite the criteria section (one more draft revision), ~3 h run |
| B. Freeze revision 2 as it stands | The same, framed as a test of learning | BELIEF, NOT LEARNING with P ≈ 0.85; the claim rules keep the record honest | No more design work, ~3 h run |
| C. Redesign for H-VOL first | Learning the rate, in a task where it is worth something | Unknown; needs new admission evidence on fresh development worlds, with a **headroom rule**: the true-rate reference must beat the fixed-ρ control by at least twice the n = 60 detectable effect before a learning gate is specified. Candidate levers: carry ρ across worlds (H-VOL-XFER), make re-tests expensive or slow to reveal, longer and variable delays | Design work; no gate soon |

A and C are complementary: A records the capability that exists; C asks the open question properly. Two further
design questions came out of this pass and belong to C, not to CF-06: the change detector's false alarms (0.85 per
run) bias any learned rate, and the planner's optimism after a reset already does some of the re-testing a belief is
supposed to decide.

## 6. The owner's decision and revision 3

**2026-11-15, the owner: "Re-scope to belief" (option A).** Revision 3 of the draft (`GATE_SPEC.md`) makes the
belief the claim and its simplest form the primary arm:

| Item | Revision 2 | Revision 3 |
|---|---|---|
| Claim | VOL learns how often changes reverse | **A two-regime belief per changed exit beats every fixed willingness to re-test** (H-BEL) |
| Primary arm | VOL (ρ learned) | **BELIEF**: model v6 with ρ fixed at 1/2 (no learning across changes), h = 0.01 — the arm that was the control |
| Criteria | V1–V7 | **B1** mix against the four fixed policies; **B2** safe in RARE; **B3** helps in OFTEN; **B4** mechanism: recovers reopened routes better than the planner (OFTEN) *and* gives up on permanent changes from evidence, not on a clock (RARE, futile re-tests against RECALL at the same h); **B5** no regression; **B6** infrastructure |
| Learning the rate | V7 pass/fail, verdict BELIEF, NOT LEARNING | **Reported** as L1–L4 with claim rules (VOL against BELIEF per family and on the mix; headroom; direction of ρ; stopping re-tests) — the eight corrections stay in force, as reports |
| h sensitivity | on VOL | **on the primary** (BELIEF at h = 0.003, 0.03); revision 2's VOL figures stay in the disclosure |
| Arms | 10 | 10: the planner, three RECALL, BELIEF and its two h variants, VOL, the true-rate reference, ORACLE |
| Battery | VOL against the planner | BELIEF against the planner (criterion), VOL reported |

The selection is disclosed: the primary was chosen after the development worlds showed that learning the rate added
nothing measurable. It is the *simpler* mechanism, chosen for its simplicity and for what the task can test, not for
a better development score (BELIEF and VOL differ by 4.4 steps). Only `gate6` can confirm it.

**Revision-3 development run (2026-11-16).** All 640 rows the run shares with revision 2 are identical field by
field; it adds BELIEF at h = 0.003 and 0.03 (120 rows) and BELIEF on the battery (80). The driver's development
verdict is SUPPORTED, which is expected and is not evidence (`GATE_SPEC.md`, development disclosure). Three findings
from it changed the draft:

| Finding | Evidence (dev) | Change made |
|---|---|---|
| Part of the gain over the planner does not come from reopened routes: keeping the old regime also returns the agent to an exit its change detector wrongly flagged | dev world 3, OFTEN: +272 steps with no real reversal confirmed; world 12, HALF: +174, the same | Claim rule **gainSource** (B3 again on the OFTEN worlds without a confirmed false alarm; on dev 11 worlds, +46.6 [4.6, 111.0]: REOPENED ROUTES). B4a's description corrected: it shows the mechanism is present, it cannot attribute the gain |
| The gain is concentrated in a few worlds | B1 planner part 10 / 10 worlds, median −5; four OFTEN worlds give 90% of the OFTEN gain | Claim rule **gainShape** (CONSISTENT / TAIL-DRIVEN); limitation 2 |
| The development effects are an optimistic guide to power | the primary was chosen after these worlds | Power table with a column at half the development effect (B1 planner part and B3: 0.46 each) |

Both claim rules limit the wording and never change the verdict; they were added after the look, in the
restrictive direction, and are disclosed as such. Nothing in B1–B6, the arms, the constants or the sample size
changed.

## 7. Gemini's review of revision 3 and revision 3.1 (2026-11-16)

**Source.** The owner relayed Gemini's verdict on revision 3: *conditional freeze after mandatory re-scoping and power
amendments*; the BELIEF mechanism with ρ = 1/2 accepted, not to be redesigned. The file attached with that message
(`gemini_Review-.txt`, SHA-256 `8f9d8635…`) is again the CF-05/CF-05b review, so this reconciliation works from the
owner's summary of Gemini's points, not from Gemini's text.

| Point | Assessment against the source | Change in revision 3.1 |
|---|---|---|
| **M1** power: 0.96 at the development effect, 0.46 at half; n of about 100–135 | **Valid**, and the figures are the specification's own (revision 3, normal approximation per criterion). Checked by simulating the gate's decision rule on resampled development worlds: per criterion the approximation holds; jointly it was pessimistic (0.13 by multiplication at n = 60; 0.41 simulated), because B1's planner part and B3 move together. At half effect P(SUPPORTED) = 0.41 / 0.69 / **0.82** / 0.96 at n = 60 / 100 / **135** / 200 | **n = 135**, the smallest considered size reaching 0.80 at half effect; driver `GATE6_WORLDS = 135`; method, assumptions and table in the specification; script `power_sim.mjs` |
| **M2** tail risk: gainShape into the verdict reporting | **Valid.** Revision 3 had gainShape as a claim rule beside the verdict | gainShape is now part of the verdict line whenever B1 holds ("SUPPORTED — TAIL-DRIVEN (parts)"); a third condition (a positive mean without the most favourable 10% of worlds); per-world differences, quantiles, the top decile's share and the fewest worlds that erase the mean are reported for every criterion. The simulation predicts TAIL-DRIVEN as the likely outcome, stated in advance |
| Detector false alarms: the belief treats false-alarm archives and genuine reversals identically (optional for Gemini) | **Valid**, and the owner made it a requirement: report genuine reversals, permanent changes and false alarms separately, with performance attributable to each, from evaluator ground truth, never from the agent's confirmation alone. Revision 3's gainSource split on BELIEF's own confirmations, which conditions on the agent's behaviour | Two privileged diagnostic arms, BELIEF_REALONLY and BELIEF_FALSEONLY, built the CF-05b way (`arms_v6.mjs` the only route; a predicate `archiveIf` in model v6 that does nothing unless such an arm supplies it). gainSource now reads from them, with an exactness check against `diagnoseE5`'s independent classification. A detector false-alarm evaluation plan in the specification. The confirmation split stays, as a report |

**A knock-on effect of n = 135, found while checking M1.** At n = 135 the development headroom (+14.5 for knowing
the true rate) is about the smallest effect the gate can detect, so the claim rule L2 could pass and permit "this task
can test learning the rate" while learning itself stays untestable (L1 power about 0.23 at n = 135 even at its
development mean). The wording is now tied to the registry's headroom rule: L2 *and* a headroom mean of at least
twice L1's MDE80.

**Is the change to model v6 a change to the BELIEF algorithm?** No. `archiveIf` is an optional parameter, absent for
every ordinary arm; with it absent, or always true, the model archives exactly as before. Checked: the always-true
run reproduces the plain run field by field (test), all 48 stored revision-1 rows reproduce, and the revision-3.1
development run reproduces all 840 rows of revision 3 (every field except the two new alarm counters), with every
criterion statistic identical. No correctness defect in the BELIEF algorithm was found.

**What the attribution shows on the development worlds (not evidence; reported in the specification).** The split was
exact (the real-only arm archived no false alarm and the false-only arm no genuine change, by the trace). In OFTEN the
gain over the planner comes mainly from genuine reversals (+31.5 [6.5, 68.8]; false alarms +17.6 [−0.7, 49.4]):
gainSource GENUINE REVERSALS. **On the mix, B1's advantage over the planner comes more from repairing the change
detector's false alarms (+48.0 [11.3, 93.2]) than from genuine changes (+28.9 [−6.2, 75.0]; residual −12.8).** In RARE
the belief's handling of genuine changes costs 9.8 [3.4, 15.9] steps a run and false-alarm repair pays it back (+11.3).
The OFTEN-only rule would have hidden this, so one restrictive claim rule was added after this look: gainSourceMix (the
same rule on the mix; on dev FALSE-ALARM REPAIR). By the standard Gemini set for RECALL in CF-05b, B1's advantage over
the planner is, on dev, mostly a change-detector repair. This bears on what CF-06 can claim and is put to the owner;
the mechanism and the criteria are unchanged.

**Files changed in revision 3.1, and why**

| File | Change | Why |
|---|---|---|
| `experiments/cf06/GATE_SPEC.md` | Revision 3.1: status, n = 135, the power section (simulated), gainShape in the verdict table, gainSource from the diagnostic arms, L2 wording, detector false-alarm evaluation plan, arms, reports, tests, development disclosure, limitations | M1, M2, false alarms |
| `experiments/cf06/run_gate.mjs` | `GATE6_WORLDS = 135`; arms BELIEF_REALONLY / BELIEF_FALSEONLY; every arm built through `arms_v6.mjs`; per-world distributions; attribution by category; gainShape (three conditions) in the verdict line; gainSource from the diagnostic arms; gainSourceMix; taskCanTestLearning | M1, M2, false alarms, knock-on |
| `experiments/cf06/power_sim.mjs` (new) | Simulates the gate's decision rule for n = 60, 100, 135, 200 under three scenarios | M1 |
| `cognitive/testbed/arms_v6.mjs` (new) | The only route for ground truth to a v6 agent; mirrors `arms_v5.mjs` | False alarms |
| `cognitive/mind/v6/world_model.mjs` | Optional `archiveIf` predicate (default: absent, no effect) | False alarms (diagnostic arms only) |
| `cognitive/testbed/task_e5.mjs` | `makeAgent` receives the context `isBlockedPair` (fifth argument); `diagnoseE5` splits genuine archives into reversing and permanent | False alarms |
| `cognitive/tests/test_vol.mjs` | Four tests (archive diagnostics, ground truth, exact split, leakage); fairness test now five arguments; the hand-built diagnostics test expects the two new counters | Verification |
| `docs/experiments/HYPOTHESIS_REGISTRY.md` | H-BEL and H-VOL rows | Record |
| `experiments/cf06/PREFREEZE_RECONCILIATION.md` | This section | Record |
| `docs/engineering/PROJECT_STATE.md` | Waiting block | Record |

**Review bundles.** Revision 3: `research/external/CF06_REV3_GEMINI_PREFREEZE_REVIEW_BUNDLE.md`. Revision 3.1:
`research/external/CF06_REV31_GEMINI_PREFREEZE_REVIEW_BUNDLE.md` (questions on the power simulation, the verdict line,
the diagnostic arms, the unchanged algorithm, gainSource and the open give-up-after-k question). Gemini's own text has
not been seen for either revision: the file attached each time was the CF-05/CF-05b review.

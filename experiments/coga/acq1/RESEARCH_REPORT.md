# ACQ-1 — research report (M-COGA-10)

## 1. Answer

**Decision: SUPPORTED (row A1), subject to the one classification in §5 that the Research Director may wish to rule on.**

Does MiniFlyWire acquire hidden edge reliability? Within 12,000 steps, on 100 fresh worlds, yes, weakly and late.

- **Primary estimate:** Δ = 0.131, 95% interval [0.090, 0.171], against δ = 0.10.
- **The lower bound is below δ.** The effect is detectable and is not shown to be negligible. It is not shown to exceed the margin.
- **Size:** about a fifth of a one-step tabular Q-learner on the same worlds (QB-1 0.677 [0.653, 0.700]).
- **Timing:** nothing detectable before about 6,000 steps. QB-1 passes MFW's final level inside its first 1,500 steps.
- **Mechanism:** unknown. This study was not designed to identify one.

What this establishes: in this 20-node hidden-reliability world class, MFW's decisions come to depend on the edge reliabilities it experienced,
toward the better action. It does not establish a cognitive map, a world model, planning, propagation across states, transfer or general
cognition.

## 2. Design in brief

Each world is one accepted M7 configuration used as two static environments, E1 and E2, in two separate sessions from step 0. ψ measures, at
states whose reliability-optimal action differs between E1 and E2, how far the agent's choices shift toward the set that is optimal for the
environment it actually experienced. Fixed preferences cancel, and a random walk gives 0 by construction. Primary: Δ = ψ(MFW-P) − ψ(RW) in the last
quarter of a 12,000-step budget. MFW-P is the unchanged agent in hook state P. Details: `DESIGN.md`, `DECISION_TABLE.md`, `POWER_ANALYSIS.md`.

## 3. Primary result, sample, exclusions

| item | value |
|---|---|
| Δ | 0.1306 [0.0903, 0.1710], SE 0.0203, df 88.6 |
| rule | L > 0 and not (U < δ): A1 |
| L ≥ δ | no |
| worlds | 100 allocated, 100 analysed, 0 void, 0 replaced |
| sessions | 600 + 20 repeats, 620/620 complete |
| per-world Δ | SD 0.202, range −0.397 to 0.650, positive in 75 of 100 |

Full tables: `RESULTS.md`.

## 4. Baselines, power and null calibration

**Baselines.** RW −0.000 [−0.004, 0.003]; QB-1 0.677 [0.653, 0.700]; Dyna-Q 0.603 [0.581, 0.626]. MFW-P − QB-1 = −0.546 [−0.591, −0.501].

**Secondary arms.** A − P = −0.050 [−0.114, 0.014]; H − P = 0.016 [−0.048, 0.079], at 97.5%. Neither repair shows a detectable change in the end
level. Exploratory: H does lead P in the first 3,000 steps, by 0.080 [0.024, 0.137], which matches development. MFW-A's development pattern did
**not** replicate: its early lead vanished (0.020 [−0.033, 0.073] against P) and it ended lower. The statement in `MECHANISM_AUDIT.md` that aligned
credit starts earlier is therefore withdrawn (addendum there).

**Power.** n = 100 by the preregistered rule (`POWER_ANALYSIS.md`): at δ, power ≥ 0.969 and equivalence ≥ 0.962 in all four scenarios, type I
0.050–0.052. The observed SD of Δ_w, 0.202, is inside the planned range (development 0.188; scenario × 1.25 = 0.235).

**Null calibration.** The frozen interval had type I 0.047–0.055 and coverage 0.945–0.953 in simulation. On the confirmatory worlds the random walk
sits inside ±δ and QB-1 above δ, so row A7 does not apply. A void share of 0 and 20/20 identical repeats clear A8's measured conditions; its defect
clause is §5.

## 5. A design omission found after the outcome

**What.** `main.js:5018` skips the environment when the chosen `next` is the goal: a goal-entering choice resets the episode at once. So in MFW
- the final hop never slips: edges into the goal have effective p = 1 in both environments;
- goal-entering choices are not environment attempts, so they are not in the log and not in the primary metric;
- baselines, by contrast, do face a slip on the final hop.

**How it was missed.** The fact was recorded before the design (`../M1_AUDIT.md` F8). I did not carry its consequences into the ACQ-1 design. The
propagation design's line that MFW "sees the same arrivals" is incomplete, and the fairness table in `DESIGN.md` §4 omits this asymmetry. That
omission is mine. It surfaced only when a diagnostic counted goal arrivals in the logs and found zero.

**Size.** 10 of the 632 SWITCH states are goal-adjacent. Goal-entering choices are 0.7% of MFW-P's decisions at SWITCH states in the window (1,242 of
186,934). The sessions record them (`goalResets`), so they can be restored from raw data. There are 0 goal entries from a non-neighbour.

| check | Δ | row |
|---|---|---|
| goal-entering choices restored | 0.130 [0.090, 0.171] | A1 |
| goal-adjacent states dropped | 0.134 [0.093, 0.174] | A1 |
| SWITCH sets recomputed for the environment MFW actually met (goal edges p = 1) | 0.146 [0.104, 0.189] | A1 |

**Classification (decision).** Row A8 voids the study on "an implementation defect found after the freeze". I do not invoke it, on this test: a
defect is code that diverges from the frozen protocol. Here the code does what the frozen text says. `DESIGN.md` §6 counts edge attempts,
`../DESIGN.md` §2 states "at most one attempt" and cites these lines, and the agent is the pinned, unchanged runtime. This is a gap in what the design
disclosed. The same test would apply had the result been negative. The omission also cannot create ψ by itself: a memoryless policy that ignores
reliability keeps equal shares of the remaining decisions in E1 and E2.

This is a judgment about the wording of A8, made after the outcome was known. If the Director reads "implementation defect" more widely, the
consequence is A8 and a new run under a new freeze. The checks above are the evidence for either reading.

## 6. Alternative explanations

Exploratory, written after the outcome. They do not change the decision; they ask whether "acquisition" is the right reading of the number.

| alternative | what it predicts | result | reading |
|---|---|---|---|
| chance, including random lock-in to a route | mean 0 | stratified sign-flip test: 0 of 200,000 at least as extreme | rejected |
| retry dynamics: failure changes attempt shares without any stored preference | first-attempt ψ falls to 0 | 0.149 [0.108, 0.189] | rejected. MFW repeats a failed edge 82% of the time (RW 26%), which inflates unreliable edges and **lowers** ψ. This explains part of the early negative values: [0, 1500) is −0.050 on all attempts, −0.028 [−0.067, 0.012] on first attempts |
| arrival mix: a history-dependent non-learner behaves differently because it arrives from different neighbours | ψ falls to 0 within (state, predecessor) | 0.128 [0.087, 0.168] | rejected. `DESIGN.md` §6's identification sentence holds strictly only for memoryless policies; this check covers the gap |
| reliability-blind goal gradient: E1 has twice E2's reliable edges, so arrivals are more frequent and a generic gradient is stronger | ψ ≤ 0 where A2 is the nearer route | 0.149 [0.065, 0.234] where A2 is nearer; 0.142 [0.094, 0.190] at equal hops | rejected as the explanation. The choice follows which route is reliable, against hop distance |
| leak of p into the runtime | any | leak scan clean; RW 0 | no evidence |

**What remains open.** Which channel carries this. MFW also improves in a way that is not environment-specific: goal entries rise by 48 [41, 55] per
1,000 steps in E1 and 58 [49, 66] in E2 between the first and last windows. Those counts are not comparable with the baselines (§5). The
cross-world placebo is near 0 for most agents but 0.042 [0.007, 0.078] for H. It is a weak placebo, because worlds sharing a goal are related and
E1 and E2 differ systematically, so a small value is not surprising, and it is recorded as observed.

## 7. Reproducibility and provenance

| check | result |
|---|---|
| readiness at the start of the run | 16/16 gates, HEAD `4fbba10`, repeated by the runner itself (`evidence/confirmatory_readiness.json`) |
| manifest | 620/620 sessions; all 621 file hashes match on re-reading |
| session provenance | all 620 confirmatory; pinned trees (P, H `3d3266fd…`; A `e5c8a8b1…`); map audit 620/620, oracle executions 0; refusals 0; clock violations 0; RNG instance check 620/620; 12,000 ticks 620/620; seeds match the allocation |
| determinism | 20/20 repeat logs byte-identical |
| analysis | re-run: `results.json` sha256 identical (`84d56d03…`) |
| independent re-derivation | `audit_primary.mjs`, none of the frozen metric, set or interval code: per-world ψ agrees to 1e-16; Δ and interval agree to 8 decimals |
| seed independence | indices 3240–3339 disjoint from all recorded territory; the 4,240-index stream regenerated from seed 200,000 by a separate process, 2,008 rows and the 100-world allocation, 0 mismatches |
| tests after the run | `VERIFICATION_REPORT.md` §6 |

Reproduce:

```bash
node experiments/coga/acq1/run_confirmatory.mjs --out experiments/coga/data/acq1-confirmatory
```
```bash
node experiments/coga/acq1/analyze.mjs --confirmatory experiments/coga/data/acq1-confirmatory --out experiments/coga/acq1/evidence/results.json
```
```bash
node experiments/coga/acq1/audit_primary.mjs --dir experiments/coga/data/acq1-confirmatory --results experiments/coga/acq1/evidence/results.json --out experiments/coga/acq1/evidence/primary_audit.json
```
```bash
node experiments/coga/acq1/posthoc.mjs --dir experiments/coga/data/acq1-confirmatory --out experiments/coga/acq1/evidence/posthoc.json
```

## 8. Protocol deviations

| item | status |
|---|---|
| protocol, parameters, stopping | none changed. No session re-run, none replaced, no interim look |
| design omission | §5 |
| analyses added after the outcome | `audit_primary.mjs`, `posthoc.mjs`; labelled exploratory; neither replaces a frozen analysis |
| independent seed stream | finished after the freeze, so the freeze did not depend on it; it agreed |
| hold on tree builders during the run | kept |

## 9. Limitations

1. **One world class.** One graph, four goals, slip-in-place dynamics. Nothing here generalises beyond it.
2. **Between sessions, not within an agent.** Two agents, each in one static environment from step 0. This says nothing about adapting after a change.
3. **δ is a judgment,** set with MFW's development estimate known. The consequence figure behind it (a median 11.6% fewer steps) is a calculation from a
   uniform policy, not a measurement on MFW. The decision is the same at δ = 0.05 and 0.15, but that is a rule outcome, not a proof that 0.13 matters.
4. **The horizon came from development data.** The window was placed where development showed the rise. Fresh worlds confirm the level; the plateau
   near 0.15 by 36,000 steps is still development-only.
5. **ψ is not performance.** It is a choice shift at selected states. No like-for-like performance comparison with the baselines exists here (§5).
6. **Tuning asymmetry.** QB-1 and Dyna-Q were tuned; MFW was not.
7. **Provisional clock.** Variant C remains provisional under CREDIT-1. Its determinism was verified here; its validity as a model of time was not tested.
8. **Heterogeneity.** 25 of 100 worlds had Δ ≤ 0; the mean does not describe every world.
9. **Exploratory intervals** are unadjusted and were chosen after the outcome.
10. **No external review.** Gemini has not reviewed the ACQ-1 design, the freeze or this report.
11. **Raw sessions exist on one disk only** (112 MB, git-ignored) until the owner backs them up.

## 10. The propagation study

The ruling asks whether it remains viable under its original frozen estimand and assumptions, given that acquisition is demonstrated.

**Finding: not viable as written. It stays paused, unrun and unmodified; its lock remains null.**

1. Its estimand assumes reliability knowledge acquired in 1,500 pre-shift steps. On 100 fresh worlds, Δ in [0, 1500) is −0.052 [−0.093, −0.012].
   The first bin with an interval above 0 is [6000, 7500) (exploratory). ψ is not the P2 statistic, but it is the better-identified measure, and it
   agrees with P2: no acquisition exists at that horizon. P2's failure is now explained by exposure, not by inability.
2. Its δ and q_min were never set, so even its decision rows are incomplete.
3. Lengthening the pre-shift phase would change the estimand's assumptions. That is a new study, not this one. Its prospects are poor as things
   stand: after a full 12,000 steps of direct experience, ψ at DISTAL states is 0.095 [0.004, 0.186] (exploratory; QB-1 0.557), about the size of the
   margin, and a fast update at a first post-change decision would not be expected to exceed that. `MECHANISM_AUDIT.md` found no fast edge-level
   channel live in state P.

ACQ-1 does not show propagation, and its positive result must not be read as evidence for it.

## 11. Recommendation

1. **Accept ACQ-1 as SUPPORTED with its stated limit**, after ruling on §5. The honest headline: *real but small and slow reliability acquisition*.
2. **Do not start a longer propagation study now.**
3. **Next scientific step:** a channel ablation on development worlds, to find what produces the late rise, then a new versioned design. Until a
   channel is known there is no candidate mechanism for propagation and no principled repair for the low level.
4. **Keep hook state P** as the primary configuration. H shows no end-level gain. A showed no gain and did not replicate its development pattern.

## 12. Milestone commits

| milestone | commit | verification |
|---|---|---|
| M-COGA-1 audit | `9432f63` | re-verified at the start of the ruling |
| census rules | `8740c06` | re-verified |
| M-COGA-2 design and census | `29216c9` | census identical to evidence |
| M-COGA-3 environment and agents | `cba6352` | test_coga 21/21 + 5/5 |
| M-COGA-4 propagation validation (P2 fails) | `881c0dd` | P2 re-derived independently |
| M-COGA-5 ACQ-1 audit and design | `cd4841f` | test_acq1, test_mutants |
| M-COGA-6 mechanism change | none made | `MECHANISM_AUDIT.md` |
| M-COGA-7 validation and freeze | `4d1baff` | dev gates, allocation, rehearsal |
| M-COGA-8 readiness and lock | `4fbba10` | 16/16 gates |
| M-COGA-9 confirmatory run | no code change; data git-ignored | 620/620 |
| M-COGA-10 results and report | the commit carrying this file | this report |

None is pushed. `origin/main` remains `4122186`.

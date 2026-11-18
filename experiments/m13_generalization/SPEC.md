# M13 — cognitive generalization: the adopted belief on a held-out modular-ring family

**Status.** Frozen, 2026-11-18, on the owner's word "Freeze and run", at revision 2.
- **Built** on the owner's word "Approve with diagnostics", after [PROPOSAL.md](PROPOSAL.md).
- **Revision 2** makes the owner's three corrections: the verdict hierarchy, power and exclusions, and diagnostic
  attribution.
- **Approved** by the owner, together with the driver's alignment to it ("Approve both"). The reading rule now writes
  the five lines and the summary statement, and G0 requires no exclusion.

The driver refuses to run the study unless this line begins "Frozen" and every line of `SPEC.sha256` matches.

**Name.** "M13" is the owner's name for this milestone. Its folder is `experiments/m13_generalization/` because
`experiments/m13/` holds an earlier, unrelated record guarded by its own verifier.

## Question

Does the adopted AD-13 belief keep its advantages over MBVI3 when it is moved, with nothing tuned, to a family of
worlds that is structurally different from the one it was developed on and that no agent has seen?

This is a development-level study. It decides nothing about AD-13 by itself.

## What runs

Every part the agents and the task use is existing code, used unchanged.

| Part | What it is |
|---|---|
| **Worlds** | The modular-ring family ([`worlds_modular.mjs`](worlds_modular.mjs)): 4 modules of 6 nodes; inside each module a random spanning tree plus random edges up to 8; one bridge from each module to the next, in a ring; degree at most 4. A new graph per label. The 165 graphs are frozen in `graph_bank.json`. The testbed's hidden relabelling is applied by an exact copy of its `finish()`, proven identical by a test |
| **Task** | E5 (`cognitive/testbed/task_e5.mjs`), parameters as frozen for CF-06: 600 exploration steps in 50-step episodes, 30 training episodes, 6 events each with 10 blocked and 10 after episodes, cap 200, start at least 3 hops from the goal. Each block reopens with probability 0.1 (RARE), 0.5 (HALF) or 0.9 (OFTEN). Edge reliabilities 0.5–1 per label |
| **BELIEF** | `makeAdoptedAgent` (AD-13): model v6, ρ fixed at 1/2, h = 0.01, every other parameter at its default |
| **MBVI3** | The registry's MBVI3, the baseline |
| **BELIEF_REALONLY / BELIEF_FALSEONLY** | CF-06's privileged diagnostic arms (`arms_v6.mjs`): BELIEF with exactly its parameters, archiving only genuine changes / only false alarms, by ground truth. Secondary; in no criterion |
| **Behaviour measures** | [`measures.mjs`](measures.mjs), from the environment's own step log (`GraphEnv.trace()`), the same for every arm. Checked in every run against the task's own counts |
| **Recorder** | `experiments/m11_routes/trace.mjs`, passive, on labels 0–2 for the core arms |

## Fixed in advance

- **Labels:** `m13|modular|0` … `m13|modular|164` (165), in each of the three families, for all four arms. The driver
  refuses any label in a namespace used before (`cf|`, `mfw|`, `m13survey|`, `m13test|`, `m13smoke|`,
  `m13|structure|`).
- **Sample size:** 165 labels, all of them analysed (see "Sample size and power").
- **Worlds:** `graph_bank.json`, pinned by hash. It is regenerated and compared before the run.
- **Structural record and novelty check** (`structure.json`, from the graphs and the schedules alone; no agent):

  | | Development family (`cf|dev|world|0..164`) | App graph | **Bank** |
  |---|---|---|---|
  | Nodes / edges / cyclomatic number | 24 / 30 / 7 | 20 / 39 / 20 | **24 / 36 / 13** |
  | Clustering: mean [5th, 95th percentile] | 0.053 [0.000, 0.167] | 0.075 | **0.355 [0.243, 0.464]** |
  | Start–goal distance | 4.07 | 3.17 | **4.58** |
  | Blocks costing no detour / a detour of 4+ steps | 29% / 3% | 69% / 0% | **34% / 10%** |
  | Skipped events | 36 of 2,970 | 0 | **1 of 2,970** |

  **Novelty holds:**
  - the bank's 5th-percentile clustering (0.243) is above the development family's 95th percentile (0.167);
  - every bank graph has cyclomatic number 13, and every development graph has 7.
- **Pins:** `PINS.json` holds the SHA-256 of every file the driver executes (44 files: its full static import
  closure, including all agent, model, planner, task, environment and statistics code), the data, and the two scripts
  it runs.
- **Exclusions:** task E5 excludes a (label, family) only when `planE5` finds no start–goal pair at distance 3 or
  more. That is a pure function of the label's graph, so it is computed from the frozen bank before the freeze.
  - The result: **none** of the 495 (label, family) pairs is excluded (`power/power_m13.out`, section 0).
  - The analysed sample is therefore fixed now: all 165 labels, in all three families.
  - No label is ever replaced or added.
  - Any exclusion at run time would mean the code or the bank had changed despite the pins, and makes the run INVALID
    (G0).
  - Skipped events (1 of 2,970 in the bank) do not exclude anything; they are reported.
- **Statistics:** per-label paired differences; mean and 95% paired percentile bootstrap (10,000 resamples, seeded by
  label, `pairedBootstrap`); the median and the number of labels each way. Inequalities are strict, and an empty
  contrast never passes.

## Criteria

Each criterion is a per-label paired difference, with its mean and its 95% paired percentile bootstrap interval
[lower, upper]. Each is decided on its own; no criterion's result changes another's.

| | Role | Criterion | Statistic | Passes when |
|---|---|---|---|---|
| **G0** | Validity gate | Validity | Core rows of run A and run B identical; `node scripts/test.mjs` passes; the novelty check holds; no (label, family) excluded | all four |
| **G1** | **Primary** | Net advantage | Per label, the sum over RARE, HALF and OFTEN of steps(MBVI3) − steps(BELIEF) over the change phase | mean > 0 and lower > 0 |
| **G2** | **Safety** | Permanent-change safety | RARE, per label, steps(BELIEF) − steps(MBVI3) | upper < 25 (CF-06's B2 margin) |
| **G3** | Secondary | Recovery | OFTEN, per label, steps in the 10 episodes after each reopening, MBVI3 − BELIEF | mean > 0 and lower > 0 |
| **G4** | Secondary | Behavioural mechanism | OFTEN, per label, the number of reopened edges the agent tried while they were blocked and crossed again after the reopening (at any time), BELIEF − MBVI3 | mean > 0 and lower > 0 |

## Verdict

The result is reported as **five independent lines**, one per criterion. Then comes **one summary statement**, built
from G0, G1 and G2 only.

| Line | Value | Condition |
|---|---|---|
| **Validity** (G0) | VALID | all four parts hold |
| | INVALID (*failing parts*) | otherwise; no other line is then interpreted, though all are printed |
| **Net advantage** (G1, primary) | RETAINED | mean > 0 and lower > 0 |
| | REVERSED | upper < 0 (BELIEF takes more steps than MBVI3) |
| | NOT SHOWN | otherwise (the interval contains 0) |
| **Safety** (G2) | SAFE | upper < 25 |
| | NOT SHOWN SAFE | upper ≥ 25 |
| **Recovery** (G3, secondary) | SHOWN | mean > 0 and lower > 0 |
| | NOT SHOWN | otherwise |
| **Behavioural mechanism** (G4, secondary) | SHOWN | mean > 0 and lower > 0 |
| | NOT SHOWN | otherwise |

**Summary statement** (the only sentence the record may use about generalization):

| Validity | Net advantage | Safety | Summary statement |
|---|---|---|---|
| INVALID | any | any | **INVALID — NO CRITERION IS INTERPRETED** |
| VALID | RETAINED | SAFE | **NET ADVANTAGE RETAINED ON THE MODULAR FAMILY, WITHIN THE SAFETY MARGIN** |
| VALID | RETAINED | NOT SHOWN SAFE | **NET ADVANTAGE RETAINED ON THE MODULAR FAMILY; SAFETY NOT SHOWN** |
| VALID | NOT SHOWN | any | **NET ADVANTAGE NOT SHOWN ON THE MODULAR FAMILY** |
| VALID | REVERSED | any | **NET ADVANTAGE REVERSED ON THE MODULAR FAMILY** |

**Rules for reading the lines:**
1. **The secondary criteria cannot change the summary.** G3 and G4 never enter it. A G3 or G4 failure does not erase
   a retained net advantage, and a G3 or G4 pass does not create one.
2. **"Generalizes" and "keeps its advantage" are reserved.** They may be written only with the second summary
   statement, and always as "on one held-out structural family, in one development-level run".
3. **Claims about recovery and behaviour need their own line.**
   - "Recovers reopened routes faster" may be written only when Recovery is SHOWN and the OFTEN attribution includes
     GENUINE (§ Attribution), the CF-06 rule.
   - "Its belief changes what it does after meeting a block" may be written only when the behavioural mechanism is
     SHOWN.
   - With a retained net advantage and either of these NOT SHOWN, the record says the net advantage held but that
     account was not shown on this family.
4. **gainShape** is CF-06's rule, reported for G1 and G3 on their own lines. It is **CONSISTENT** if the criterion
   has:
   - more labels in favour than against;
   - a positive median;
   - a positive mean once the most favourable ⌈0.1 n⌉ labels are removed.

   Otherwise it is **TAIL-DRIVEN**, naming each failing part. It never changes a line. With a retained net advantage
   and a TAIL-DRIVEN G1, the summary statement ends with " — FROM A MINORITY OF LABELS", and the record prints the
   per-label differences and the top decile's share.
5. **Multiplicity.** G1 is the single primary test. G2 is a separate safety bound. G3 and G4 are secondary,
   uncorrected, and support no claim beyond their own lines.

## Sample size and power

The full calculation is in `power/power_m13.mjs`, with its output in `power/power_m13.out` and `power_m13.json`. It
reads the stored CF-06 and M11 rows and the frozen bank, and runs no agent.

To reproduce it:

```
node experiments/m13_generalization/power/power_m13.mjs
```

It takes about 4 minutes and is deterministic.

**Model (G1).**
- **The difference:** for label i, dᵢ = Σ over f ∈ {RARE, HALF, OFTEN} of steps_MBVI3(i, f) − steps_BELIEF(i, f). The
  three families are not separate tests: each label contributes one paired difference, their sum (CF-06's B1 unit).
- **Independence:** labels are independent draws. Each has its own graph, layout, schedule, reliabilities and agent
  streams.
- **Correlation between families:** the families of one label share the graph and the layout, so their differences
  may be correlated. The SD used is the SD of the sum, so these covariances are included; no independence between
  families is assumed. The recorded within-label correlations are 0.161, 0.203 and 0.472 in CF-06 (SD of the sum
  190.6, against 153.3 if independent), and −0.08 to 0.05 in M11.
- **Effect size:** the standardized effect is δ = μ/σ of dᵢ. The planning assumption is δ = 0.22, half the smaller
  recorded value (CF-06 0.4442, M11 0.4982; half is 0.2221). No assumption is made about σ itself: power depends
  only on δ.
- **Test:** G1 passes when the 95% paired percentile bootstrap interval lies above 0. Its normal approximation is the
  one-sided z-test at α = 0.025: power(n) = Φ(δ√n − z₀.₉₇₅).

**Calculation.** With z₀.₉₇₅ = 1.959964 and z₀.₈₀ = 0.841621:

n = ⌈((1.959964 + 0.841621) / 0.22)²⌉ = ⌈162.17⌉ = 163.

| δ | n = 116 | n = 163 | **n = 165 (analysed)** |
|---|---|---|---|
| 0.20 | 0.577 | 0.724 | 0.729 |
| **0.22** | 0.659 | 0.802 | **0.807** |
| 0.30 | 0.898 | 0.969 | 0.971 |

The n = 116 column shows the draft's worst case, 10% excluded. That rule is withdrawn.

**Check by simulation.** Each cell is 2,000 simulated studies, each analysed with the study's own `pairedBootstrap`
(10,000 resamples) and the rule "mean > 0 and lower > 0", at δ = 0.22. The power at n = 165 was:

| Shape of dᵢ | Power at n = 165 | Monte Carlo SE |
|---|---|---|
| Normal | 0.806 | 0.009 |
| CF-06's recorded G1 differences (standardized, shifted to δ) | 0.911 | 0.006 |
| M11's recorded G1 differences (standardized, shifted to δ) | 0.846 | 0.008 |

The analytic 0.807 is the planning figure. The recorded skewed shapes give more power, not less.

**The analysed sample.** Exclusions are computed from the frozen bank, and there are none (see "Fixed in advance"). So
the analysed n is 165, power at δ = 0.22 is 0.807, and no label is replaced.

**The other criteria:**
- **G2** passes when its upper bound is below 25.
  - With CF-06's cost and SD (17.40, 27.08), P(pass) at n = 165 is 0.950.
  - With M11's (2.87, 12.80), it is 1.000.
  - With the larger SD, a true cost up to 19.1 steps passes with 80% probability.
- **G3** (secondary): power is 0.807 at δ = 0.22, and above 0.999 at the recorded G3 effects (CF-06 0.626, M11
  0.450).
- **G4** (secondary): no earlier record measured MBVI3's returns, so no spread is known and **no power is claimed**.
  The result reports its minimum detectable effect, (z₀.₉₇₅ + z₀.₈₀) · SD/√n.

**Assumptions, stated:**
- The new family's standardized effect is unknown; 0.22 is the smallest effect the study is designed to detect, not
  a prediction.
- The normal approximation is used for planning; the simulation checks it with the recorded shapes.
- Power refers to G1 only.

## Attribution (diagnostic arms; reported, never in a criterion or a verdict line)

The rule is CF-06's, applied unchanged. It is stated here in full.

**Contrasts** (per label; steps over the change phase unless stated):

| Name | Exact contrast |
|---|---|
| A1 genuine, OFTEN, total | OFTEN, steps(MBVI3) − steps(BELIEF_REALONLY) |
| A2 genuine, OFTEN, after reopenings | OFTEN, steps in the 10 episodes after each reopening, MBVI3 − BELIEF_REALONLY |
| A3 false alarms, OFTEN, total | OFTEN, steps(MBVI3) − steps(BELIEF_FALSEONLY) |
| A4 genuine, mix | Σ over RARE, HALF, OFTEN of steps(MBVI3) − steps(BELIEF_REALONLY) |
| A5 false alarms, mix | Σ over RARE, HALF, OFTEN of steps(MBVI3) − steps(BELIEF_FALSEONLY) |

**How a contrast is decided:**
- **Statistic:** the mean, with the 95% paired percentile bootstrap interval (10,000 resamples, seeded by
  `m13|stats|m13|attr|…`).
- **Threshold:** a contrast **holds** iff mean > 0 and lower > 0. The inequalities are strict, and an empty contrast
  never holds.

**The two attributions:**
- **GENUINE (OFTEN)** iff A1 and A2 both hold. **FALSE (OFTEN)** iff A3 holds.
- **GENUINE (mix)** iff A4 holds. **FALSE (mix)** iff A5 holds.

**The label**, reported separately for OFTEN (`gainSource`) and for the mix (`gainSourceMix`):

| GENUINE | FALSE | Label |
|---|---|---|
| holds | holds | GENUINE REVERSALS AND FALSE-ALARM REPAIR (mixed) |
| holds | does not | GENUINE REVERSALS |
| does not | holds | FALSE-ALARM REPAIR |
| does not | does not | NOT ATTRIBUTED |

**Exactness check.** The split is exact iff, in every label and family:
- BELIEF_REALONLY opened no archive on an exit that was not blocked (`alarms.opensFalse` = 0);
- BELIEF_FALSEONLY opened none on an exit that was blocked (`alarms.opensReal` = 0).

Both counts come from the task's ground-truth diagnostics. If either fails, both labels read **INVALID (the
diagnostic split is not exact)**, and no attribution is interpreted.

**What attribution can and cannot say:**
- The two diagnostic effects need not add up to BELIEF's. No residual is tested.
- Attribution changes no verdict line and no summary statement. Its only use is the wording rule for "recovers
  reopened routes" (§ Verdict, rule 3).
- The diagnostic arms intervene on what the belief archives. They do not show that returning causes the gain.

**Isolation of ground truth:**
- **The ordinary arms never receive ground truth.**
  - BELIEF is built by `makeAdoptedAgent(env, label)` and MBVI3 by `makeAgentForV6('MBVI3', env, label, {})`. Neither
    builder takes the task's context; `runOne` hands it to them as an unused third argument.
  - The context reaches only two other places. The first is the passive recorder, for the core arms' trace labels:
    it reads `context.isBlockedPair` to label its own record and returns nothing to the agent (`act`, `observe` and
    `inspect` pass through; traced and untraced rows are identical).
  - The second is the diagnostic arms' builder.
- **The diagnostic arms stay isolated.**
  - `armAgentV6` (CF-06's `arms_v6.mjs`, unchanged) derives a single predicate, "this exit is blocked now", from the
    context. It passes it only as `archiveIf` into that arm's own model.
  - Every run builds a new environment, agent and model, so nothing passes between arms or runs.
  - The behaviour measures read the environment's step log after the agent's last step.
- **Tested** in `test_m13_generalization.mjs`:
  - ARMS: BELIEF has no `archiveIf`; each diagnostic arm has one and otherwise exactly BELIEF's parameters.
  - PASSIVE: the recorder and the environment reference change no row; `runOne` equals `runE5` with the adopted
    agent.

## Reported, never in a criterion

- **Generalization size:** G1's mean / SD, beside 0.444 (CF-06) and 0.498 (M11).
- **G4's minimum detectable effect:** 2.80 · SD/√n, computed in RESULTS.md from G4's recorded SD and n.
- **Moderator:** per reversing event, the after-window difference by the block's detour excess (0, 1–3, 4+).
  Descriptive. It asks whether M12's observational account carries over; it is not a test of it.
- **Per family and arm:** every measure, the detector counts, BELIEF's archives (genuine reversing, genuine
  permanent, false) and confirmations, returns (own window, later only), and the median steps from reopening to the
  first return.
- **The 18 traces:** BELIEF's and MBVI3's predicted chance that a blocked exit works, over time.

## Integrity

- **Run once,** with `node experiments/m13_generalization/run_m13.mjs --domain m13`. The driver refuses if any of these
  hold:
  - this file is not Frozen;
  - a line of `SPEC.sha256` does not match;
  - a pinned file differs from `PINS.json`;
  - `cognitive/`, `scripts/`, this folder or the recorder has an uncommitted change;
  - the bank or the structural record differs from the generator;
  - a label is not fresh;
  - the novelty check fails;
  - the test suite fails;
  - a result exists.
- **Determinism and passivity.**
  - Run A runs all four arms, with the recorder on the trace labels.
  - Run B repeats the core arms without it.
  - The core rows must be identical.
- **Recorded with the result:**
  - HEAD at launch and at the end;
  - this file's SHA-256 and the pins' SHA-256;
  - the bank's SHA-256;
  - Node version and platform;
  - the test result;
  - the SHA-256 of `main.js`, `index.html`, `connections.json` and `neurons.json` (`main.js` is expected to be
    `c92c5c6b…`, untouched).
- **Nothing is tuned after the run.** `experiments/m13_generalization/RESULTS.md` is written whatever the outcome, and
  an independent check is written before the result is seen.
- **Looks before the freeze (disclosed):**
  - the structure survey of PROPOSAL.md (prototype labels `m13survey|*`, no agent);
  - the structural record above (no agent);
  - the power calculation (`power/`): it reads the stored CF-06 and M11 rows and the frozen bank, runs no agent and
    reads no modular-world outcome;
  - the regression tests, which run agents only on development-family worlds (`m13test|*`);
  - two driver smoke runs on development-family worlds, checked for output structure, determinism and timing only,
    with no measure printed or read:
    - the first on `m13smoke|dev|0` and `1`;
    - the second, after the alignment, on `m13smoke|dev|0`.

  No agent has run on a modular world.

## What it can and cannot show

**It can show:**
- whether the advantage survives a structural shift with nothing tuned;
- whether an agent that met a block comes back to it, measured the same way for both agents in every run;
- from the diagnostic arms, whether the gain needs belief about genuine changes, about false alarms, or both.

**It cannot show:**
- other families or larger worlds;
- which of the shifted descriptors matters (clustering, cycles, route length and detour length move together);
- that returning causes the gain within an agent;
- anything confirmatory: one run, by the designer, on local commits.

## Consequence

None for AD-13 or the agent. The result is recorded. With the summary statement **NET ADVANTAGE RETAINED ON THE
MODULAR FAMILY, WITHIN THE SAFETY MARGIN**, the record may say the belief kept its advantage on one held-out structural
family, in one development-level run. It may not say that the belief generalizes in general.

## Run

**Time:** about 2.5 hours, plus about 4 minutes for the test suite.
- Run A: 165 × 3 × 4 = 1,980 E5 runs.
- Run B: 990 core runs.

In the smoke run (two development-family labels, all traced) a run took 2.7–3.2 s. The machine is kept awake with the same per-process wake request as
CF-06 and M11.

**To freeze:**
1. Set the status line to "**Status.** Frozen", with the date and the owner's word.
2. Write `SPEC.sha256` with lines for SPEC.md, PINS.json, graph_bank.json and structure.json.
3. Commit.
4. Run once.

## Files

| File | Role |
|---|---|
| `PROPOSAL.md`, `proposal_inputs/` | The approved proposal and its no-agent inputs |
| `SPEC.md`, `SPEC.sha256` | This specification and its frozen hashes |
| `worlds_modular.mjs` | The generator, the world builder and the bank |
| `graph_bank.json`, `structure.json`, `make_bank.mjs` | The frozen worlds, their structural record, and the script that writes and checks both |
| `structure.mjs` | Descriptors, novelty check, detour excess |
| `measures.mjs` | Behaviour measures for every arm |
| `m13_lib.mjs` | Configuration, arms, one run, analysis, reading rule |
| `pins.mjs`, `PINS.json` | The pinned files and their hashes |
| `power/power_m13.mjs` → `power_m13.out`, `power_m13.json` | The sample-size and power calculation, and the exclusions computed from the bank |
| `run_m13.mjs` | The driver and its refusal checks |
| `cognitive/tests/test_m13_generalization.mjs` | Regression tests (in `npm test`) |

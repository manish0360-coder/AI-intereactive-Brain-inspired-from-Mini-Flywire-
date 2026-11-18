# M13 — cognitive generalization: the adopted belief on a held-out modular-ring family

**Status.** DRAFT, 2026-11-18. Built on the owner's word "Approve with diagnostics" (after [PROPOSAL.md](PROPOSAL.md)).
Awaiting the owner's freeze approval. The driver refuses to run the study unless this line begins "Frozen" and every
line of `SPEC.sha256` matches.

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
- **Sample size:** 165, from PROPOSAL.md §6. The smallest effect of interest is d = 0.22, half the smaller of the
  recorded net effects (CF-06 0.444, M11 0.498). That needs 163 labels for 80% power.
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
- **Exclusions:** a (label, family) whose schedule cannot be laid out is excluded for every arm, decided from the
  graph before any agent acts. Skipped events are reported.
- **Statistics:** per-label paired differences; mean and 95% paired percentile bootstrap (10,000 resamples, seeded by
  label, `pairedBootstrap`); the median and the number of labels each way. Inequalities are strict, and an empty
  contrast never passes.

## Criteria

| | Criterion | Statistic | Passes when |
|---|---|---|---|
| **G0** | Validity | Core rows of run A and run B identical; `node scripts/test.mjs` passes; the novelty check holds; at most 10% of (label, family) excluded | all |
| **G1** | Net advantage retained (primary) | Per label, the sum over RARE, HALF and OFTEN of steps(MBVI3) − steps(BELIEF) over the change phase | mean > 0 and lower bound > 0 |
| **G2** | Permanent-change safety | RARE, steps(BELIEF) − steps(MBVI3) | upper bound < 25 (CF-06's B2 margin) |
| **G3** | Recovery | OFTEN, steps in the 10 episodes after each reopening, MBVI3 − BELIEF | mean > 0 and lower bound > 0 |
| **G4** | Belief changes behaviour | OFTEN, per label, the number of reopened edges the agent tried while they were blocked and crossed again after the reopening (at any time), BELIEF − MBVI3 | mean > 0 and lower bound > 0 |

**Verdict:**

| Verdict | Condition |
|---|---|
| **GENERALIZES TO THE MODULAR FAMILY — gainShape** | G0–G4 hold |
| **GENERALIZES IN PART (failed: …) — gainShape** | G0 and G1 hold; the failing criteria are named |
| **DOES NOT GENERALIZE** (**— HARMFUL** if G1's upper bound < 0) | G0 holds; G1 fails |
| **INVALID (…)** | G0 fails; the failing parts are named |

**gainShape** is CF-06's rule, applied to G1 and G3. It is **CONSISTENT** if each has:
- more labels in favour than against;
- a positive median;
- a positive mean once the most favourable ⌈0.1 n⌉ labels are removed.

Otherwise it is **TAIL-DRIVEN**, naming each failing part. It never turns a pass into a fail or the reverse.

## Reported, never in a criterion

- **Attribution** (CF-06's rule, verbatim), from the diagnostic arms:
  - **GENUINE:** MBVI3 − BELIEF_REALONLY holds in OFTEN, both in total and after reopenings.
  - **FALSE:** MBVI3 − BELIEF_FALSEONLY holds in OFTEN.
  - The label is GENUINE REVERSALS / GENUINE REVERSALS AND FALSE-ALARM REPAIR / FALSE-ALARM REPAIR / NOT ATTRIBUTED.
    It is INVALID if the split is not exact.
  - The same rule is applied on the mix.
  - The diagnostic arms intervene on what the belief archives. They do not show that returning causes the gain.
- **Generalization size:** G1's mean / SD, beside 0.444 (CF-06) and 0.498 (M11).
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
  - the regression tests, which run agents only on development-family worlds (`m13test|*`);
  - one driver smoke run on two development-family worlds (`m13smoke|dev|0` and `1`), checked for output structure,
    determinism and timing only, with no measure printed or read.

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

None for AD-13 or the agent. The result is recorded. With GENERALIZES, the record may say the belief kept its
advantage on one held-out structural family, in one development-level run, and not that it generalizes in general.

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
| `run_m13.mjs` | The driver and its refusal checks |
| `cognitive/tests/test_m13_generalization.mjs` | Regression tests (in `npm test`) |

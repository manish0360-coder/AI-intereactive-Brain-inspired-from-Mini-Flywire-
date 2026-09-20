# FutureScore V2.3 — Behavioural Evaluation, Pass 1 (design review only)

**Kind:** scientific design gate. **Nothing implemented, run, seeded, committed or pushed.**
**Author:** Chief Systems Engineer · **Date:** 2026-09-21 · **Anchor commit:** `952c9fcf3123eb6e7ca2deab8247d2a99af541cf`
**Frozen and not reopened:** V2.3 estimator, H=3, recursion, terminal, projection, boundary, `verify_S3prime.js`,
FS-LN-01, G9, `canReachGoal`, `goalDistance`, `goalGradientBoost`, architecture, the shipped implementation.
**Labels:** FACT / INFERENCE / HYPOTHESIS / DESIGN DECISION / OPEN QUESTION. No label is promoted.

---

## A. Executive scientific question

Two questions, and **the central design finding is that they are not answerable in the same environment**:

- **OQ-2 (why did S3.2′(b) move 5.28% → 5.55%?)** is answerable in the existing harness, because learned
  evidence is provably inert there (§D).
- **OQ-1 (does learned evidence add information beyond geometry?)** is **not answerable in that harness at all**.
  It requires an environment that can produce traversal failures.

## B. Existing evidence

| # | Item | Label |
|---|---|---|
| B1 | `stale = max(0, steps − decisions)`; `decisions` = writes to `lastReasoning` (one per `runPrediction`); `steps` = `updateQ` calls (`render/qlearning.js:272`); source `_runonce.js:19-21` | **FACT** |
| B2 | Panel `[20260818, 31337, 31338, 777, 4242, 90210]`, `TICKS = 80`, limit `RESIDUAL_LIMIT = (67/381)·0.30 = 5.28%` (`verify_S3prime.js:62-67`) | **FACT** |
| B3 | S3.2′(a) = 0/6 under forced exploration (`BOOST = 1`); S3.2′(b) median 5.55%, mean stale 22.17, deterministic across reruns | **FACT** |
| B4 | S3.2′(b) passes at `782df6e` and fails at `952c9fc`; verified in an isolated clone | **FACT** |
| B5 | The gate's header calls S3.2′(a) *"policy-INVARIANT"* and S3.2′(b) a robust aggregate meant to tolerate *"ordinary policy-induced variance in F2b occupancy"*; F2b is *"DELIBERATELY UNREPAIRED (Ruling Q3)"* | **FACT** |
| B6 | The S3′ harness installs no M7 environment, so `_m7Traversed` is unconditionally `true` (`main.js:4922-4928`) | **FACT** |
| B7 | `recordOutcome` increments `a` on every event and `s` only on a `true` outcome (`render/traversalRecord.js`) | **FACT** |
| B8 | V2.3 gate A5 proves `c_hat = 1` for all-success records; F1 proves `FS = −d(k,g)` under all-success/unseen evidence. **These are conditional properties of the mechanism, and F1 presupposes an active goal. They do NOT describe the S3′ harness, which has no goal — see D.2.** | **FACT (conditional; not applicable to the S3′ harness)** |

## C. Competing hypotheses

- **H1 — POLICY EFFECT.** V2.3 changes the decision policy enough to move the downstream stale measurement,
  without a new causal F2 failure.
- **H2 — MECHANISM EFFECT.** The V2.3 *learned traversal* mechanism increases stale-branch occupancy beyond
  policy redistribution.
- **H3 (added by this audit) — COUNTER DECOMPOSITION.** The ratio moved because its **numerator or denominator**
  moved for a reason unrelated to branch occupancy, e.g. more `updateQ` calls per tick (goal arrivals/resets) or
  fewer `runPrediction` calls per tick. **HYPOTHESIS** — currently untested and not excluded by any evidence.

## D. Causal decomposition, and the decisive structural finding

> **CORRECTED BY STUDY 1 — the original text below is preserved, not rewritten.** §D predicted that learned
> evidence is inert because `c_hat ≡ 1` implies `FS = −d`. That reasoning **assumed an active goal**. Study 1
> established by source and by measurement that the S3′ harness has **no goal at all**
> (`goalNeuronId = null`), so `futureScore` returns `undefined`, the projection returns 0, and `futureBonus ≡ 0`
> — `c_hat` is never consulted. **The conclusion "learned evidence is inert here" stands; the mechanism was
> mis-derived.** See [`../../experiments/fsbehav/STUDY1_RESULTS.md`](../../experiments/fsbehav/STUDY1_RESULTS.md) §2.
> The A-GEO predicted null still held, for the corrected reason.

```
FutureScore_V2.3 = f(G, E)      G = geometric goal information (terminal −d, topology)
                                E = learned traversal evidence (c_hat from the boundary record)
```

### D.1 HISTORICAL PREDICTION — SUPERSEDED BY STUDY 1

*Preserved verbatim as the Pass-1 prediction. **This is not a current inference.** It assumed an active goal,
which the S3′ harness does not have. Retained so that what was predicted can be compared with what was found.*

> **INFERENCE (source-derived, not measured):** in the S3′ harness there is no M7 environment (B6), so every
> attempted traversal succeeds, so `a = s` on every recorded edge (B7), so `c_hat ≡ 1` (B8), so
>
> ```
> FS = −d(k, g)   identically, for every candidate, on every tick
> ```
>
> **Consequences, and they reshape the whole evaluation:**
>
> 1. **E is inert in this harness.** The 5.55% observation therefore **cannot** have been produced by learned
>    evidence. Whatever moved, it was the change of functional form — a reward/curiosity/look-ahead-driven,
>    frequently saturated `min(FS·4, 20)` replaced by a deterministic monotone function of hop distance
>    `20·D/(D + d)`.
> 2. **This is strong analytic support for H1 and makes H2 unobservable in this environment** — not refuted,
>    *unobservable*. H2 can only manifest where failures exist.
> 3. **OQ-1 cannot be tested in the production environment**, because there `E` has no variance to contribute.
>    It needs the M7 stochastic environment (or an equivalent failure-injecting substrate), which brings seed
>    governance with it.

### D.2 CURRENT INTERPRETATION

**CURRENT INTERPRETATION — Study 1 established that the S3′ harness has no active goal. Therefore futureScore
receives a null/undefined goal, returns undefined, projection returns 0, and futureBonus ≡ 0. c_hat is never
consulted. The learned-evidence path is therefore inert in this harness, but not because c_hat ≡ 1 → FS = −d.**

| Class | Statement |
|---|---|
| **FACT** | `goalNeuronId` is null; no goal is assigned. `main.js:1042` initialises it to `null`; `_driver.js:30` forwards a goal only when the caller supplies one; `_runonce.js:6` and the Study 1 runner pass `{ seed }` only; the runtime goal-assignment block (`main.js` ~3409-3417) is commented out. |
| **FACT** | 80/80 `futureBonus` samples are zero in every V2.3 run, with `goalResets = 0`. |
| **INFERENCE** | Under the no-goal condition `futureScore` returns `undefined` (F19) and the projection returns zero (F29). |
| **CONCLUSION** | Learned evidence is **not exercised** in this S3′ harness. |

**Corrected consequences** (replacing D.1's list; the H1 wording is the frozen one from the Study 1 disposition):

1. The 5.55% observation cannot have been produced by learned evidence, because that path is never entered.
   What changed is the functional form: a reward/curiosity-driven `futureBonus` (median 20, saturated) became
   identically 0 in a goal-less harness. **Geometry is not the explanation either** — without a goal there is
   no `−d` term.
2. Evidence is **consistent with a policy-induced change** in the downstream stale measurement, but the
   six-seed paired comparison is **inconclusive regarding a systematic directional increase**. H2 is
   **unobservable** in Study 1 because learned traversal evidence is never consulted — neither falsified nor
   excluded generally.
3. **OQ-1 cannot be tested here.** It requires an **active goal** *and* a **failure-producing environment**,
   so that `c_hat` is both consulted and non-degenerate. Seed governance applies.

**DESIGN DECISION:** the evaluation splits into **Study 1 (OQ-2, this environment, no new seeds)** and
**Study 2 (OQ-1, requires an active goal and a failure-producing environment, plus separate seed
authorization)**.

## E. Experimental arms

Minimum set; each arm earns its place by the comparison it uniquely enables.

| Arm | Description | Enables |
|---|---|---|
| **A-OLD** | pre-V2.3 mechanism at `782df6e`, unchanged harness | the reference the 5.28% threshold was calibrated against |
| **A-V23** | shipped V2.3 at `952c9fc` | the observed 5.55% |
| **A-GEO** | V2.3 with evidence neutralised: `recordFor` forced to `{a:0,s:0}` by a loader hook | isolates E from the V2.3 functional form. **Predicted null:** identical to A-V23 (see §J) |
| **A-FS0** | `futureBonus` forced to 0 by a loader hook | bounds how much of the stale rate FutureScore explains at all, relative to `goalGradientBoost` |

**Rejected arms:** "V2.3 with a different H", "V2.3 with a tuned projection" — both would modify frozen
parameters and answer no question posed here.

## F. Controls — variables held identical

Across arms, per seed: graph topology (`neurons.json`, `connections.json`), starting state, goal sequence, RNG
seed, `TICKS = 80`, `BOOST` condition, candidate-admission filter, environment condition (no M7), the driver, and
Node version. **Only the decision mechanism varies.** A-OLD differs by commit; A-GEO and A-FS0 differ by a
loader hook over the same `952c9fc` tree — never by editing production code.

## G. Variables and metrics

| Metric | Numerator | Denominator | Unit | Aggregation | Direction |
|---|---|---|---|---|---|
| **P1 stale rate** (primary) | `max(0, steps − decisions)` | `steps` | one run = (arm, seed) | median across 6 seeds, plus all 6 values | **no better/worse claimed** |
| **P2 decisions/tick** | `decisions` | `ticks` | run | per-seed, paired | diagnostic |
| **P3 steps/tick** | `steps` | `ticks` | run | per-seed, paired | diagnostic |
| **P4 stale ticks** | ticks with `s > d` | `ticks` | run | per-seed | diagnostic |
| **S1 decision divergence** | ticks where the chosen `to` differs between arms | matched ticks | run pair | per-seed | magnitude of policy change |
| **S2 goal arrivals** | arrivals | `ticks` | run | per-seed | confound probe for P3 |
| **S3 FS/futureBonus distribution** | recorded values | decisions | run | quantiles | describes the projection shift |
| **S4 (Study 2 only) c_hat spread** | per-edge `c_hat` | edges with evidence | run | quantiles | is E non-degenerate at all? |

**P2/P3 exist because P1 is a ratio.** Reporting only P1 cannot distinguish "more steps" from "fewer decisions",
which is exactly H3.

## H. Seed and replication design

**FACT:** the S3′ panel is pre-declared and explicitly *"not naive"* (`verify_S3prime.js` erratum §4.5).

- **Study 1 reuses the six S3′ seeds unchanged.** DESIGN DECISION: the question is about *this* criterion, so
  continuity outweighs naivety; the non-naivety is a declared limitation carried forward, not repaired.
- **Runs are deterministic given (arm, seed)** — B3 shows reruns reproduce exactly. So replication within a seed
  adds nothing; the only variance is across seeds. **DESIGN DECISION: 1 run per (arm, seed) = 24 runs**, with a
  reproducibility spot-check of 2 runs re-executed and hash-compared.
- **Study 2 requires fresh registered seeds** from the governed ranges, and **must not** reuse development
  fixtures or the S3′ panel. **No seeds are created in this pass.**

## I. Statistical analysis

- **Unit of replication:** the seed (n = 6). **Paired variable:** seed, with arms as the within-seed factor.
- **Effect measure:** per-seed paired difference in P1 (and P2, P3), reported for **all six seeds individually**
  plus the median. No averaging away of the per-seed pattern.
- **Uncertainty:** exact sign test on the 6 paired differences, and a paired bootstrap CI for the median
  difference. **FACT:** with n = 6, the smallest attainable two-sided exact p is 1/32 ≈ 0.031, so at most one
  "significance-like" statement is even possible. **DESIGN DECISION: no α threshold is invented**; report the
  exact p, the CI, and the six raw differences, and let the pattern speak.
- **Multiple comparisons:** three planned contrasts (V23−OLD, V23−GEO, V23−FS0). **DESIGN DECISION:** report all
  three without correction, labelled explicitly as **descriptive**, since n = 6 cannot support a confirmatory
  family. This gate is a deterministic comparison, not an inference procedure.

## J. Falsification criteria

| Hypothesis | Supports | Counts against | Inconclusive |
|---|---|---|---|
| **H1 policy effect** | P1(V23) ≈ P1(GEO) > P1(OLD) on most seeds, with S1 showing substantial decision divergence | P1(V23) > P1(GEO) materially | mixed signs across seeds |
| **H2 mechanism effect** | P1(V23) > P1(GEO) with the gap tracking S4 evidence spread | **P1(V23) = P1(GEO) exactly** — E is inert, so no mechanism effect can exist here | any non-zero gap in this environment, which would refute §D and demand re-derivation |
| **H3 counter decomposition** | P3 (steps/tick) moves while P4 branch occupancy does not, or P2 falls | P2 and P3 stable while P4 rises | both move |

**The sharpest test in the design is a predicted null:** §D implies **A-GEO must be bit-identical to A-V23**.
If it is not, my source-level derivation is wrong and the entire interpretation, including FS-BD-01 §4, must be
revisited. **DESIGN DECISION: this null is the first thing Study 1 runs.** No outcome is set up to "win": H1 is
supported only if the geometric-form change also reproduces the shift relative to A-OLD.

## K. Stopping rules

1. **Complete** when the 24 Study-1 runs finish, the A-GEO null is checked, and P1–P4 plus S1–S3 are reported.
2. **Inconclusive** when per-seed differences have mixed signs and the bootstrap CI for the median spans zero —
   reported as inconclusive, with **no additional seeds added to rescue it** (that would be the threshold-hunting
   D1 forbids).
3. **Mechanism concern triggered** if the A-GEO null fails, or if S3.2′(a) ever leaves 0/6. Either **STOPS** the
   study for Director review.
4. **Additional runs justified** only for: a failed reproducibility spot-check, or Study 2 under fresh
   authorization. **No open-ended experimentation.**

## L. Data and provenance schema

Per run: `{ arm, commit, seed, boost, ticks, decisions, steps, stale, staleTicks, writes[], goalArrivals,
fsQuantiles, nodeVersion, topologyHash, hookHash, startedAt }`. Plus: anchor commit `952c9fc`, A-OLD commit
`782df6e`, `neurons.json`/`connections.json` blob hashes, hook file hashes, a per-run output hash, and an
`INTEGRITY.sha256` over the evidence directory. Replay = same (arm, seed) must reproduce the output hash.

## M. Minimal future implementation surface (Pass 2)

| Kind | Path | Note |
|---|---|---|
| harness | `experiments/fsbehav/run.mjs` | **new**; reuses `_driver.js`; must not modify `_runonce.js` (historical) |
| instrumentation | `experiments/fsbehav/hook_geo.mjs`, `hook_fs0.mjs` | loader hooks, m39/m40 pattern — **no production edit** |
| analysis | `experiments/fsbehav/analyze.mjs` | paired stats, exact sign test, bootstrap |
| evidence | `experiments/fsbehav/evidence/` | per-run JSON + integrity |
| docs | this file + a results record | — |
| **production** | **none** | **Zero production changes. If any arm cannot be built without one, STOP.** |

A-OLD runs from a **read-only git worktree/clone at `782df6e`**, never by reverting the working tree.

## N. Prior-art / reuse (focused)

| Need | Candidate | Decision | Reason |
|---|---|---|---|
| booted-agent harness | `experiments/phase1_0/_driver.js` | **REUSE** | already the S3′ substrate; unchanged |
| per-run counters | `_runonce.js` | **ADAPT** (copy the pattern into a new runner) | historical artifact; must not be edited |
| loader-hook instrumentation | `experiments/m39/hook.mjs`, `m40/hook.mjs` | **ADAPT** | established non-invasive technique |
| exact sign test / paired bootstrap | `scipy`, `jstat`, `simple-statistics` | **DO NOT USE** | ~20 lines of exact arithmetic on n = 6; a dependency would need pinning and a supply-chain pass, and MiniFlyWire stays dependency-free |
| paired-comparison methodology | standard repeated-measures practice | **REFERENCE** | no code |
| stale/branch-occupancy metric | S3′ definition | **REUSE verbatim** | the criterion under study; redefining it would beg the question |

## O. Threats to validity

1. **Ratio clamping.** `stale = max(0, steps − decisions)` **discards the sign** when decisions exceed steps.
   A shift in P1 can therefore hide compensating movement. P2/P3 mitigate; the clamp itself cannot be changed.
2. **Counter semantics.** `steps` counts `updateQ` calls, not traversals. Anything changing Q-update frequency
   (goal arrivals, resets) moves P1 without any branch-occupancy change — this is H3, and S2 probes it.
3. **Non-naive panel** (declared): these six seeds were exercised during the gate-semantics audit.
4. **n = 6** supports description, not confirmation.
5. **80-tick horizon** may not reach steady state.
6. **jsdom/driver fidelity** differs from a real browser.
7. **A-OLD at a different commit** also carries the Pass-1 doc and any incidental differences; only `main.js`
   and `render/planning.js` differ materially, but this is a confound of commit, not of mechanism alone.
8. **Study 2 environment change** (M7) alters more than E; it introduces slips, which themselves change policy.

## P. Falsification-first self-critique

- **What confounder could still explain the result?** H3. P1 is a ratio of two independently movable counters,
  and nothing yet rules out that V2.3 changed goal-arrival frequency rather than branch occupancy.
- **What comparison is missing?** A tick-matched, state-matched comparison. Arms diverge after the first
  differing decision, so per-tick pairing degrades. A same-state counterfactual (evaluate both mechanisms at the
  *same* state without executing) would isolate ranking changes from trajectory divergence — **not yet designed**,
  and it is the main gap in this proposal (§Q).
- **Which measurement is circular?** None as specified: stale is defined from counters, never from FutureScore.
  The trap would be using FS to define "correct" decisions; explicitly forbidden.
- **Which assumption is unverified?** *(Answered by Study 1, and the answer was "the assumption was wrong".)*
  D.1's `c_hat ≡ 1` claim was source-derived and gate-supported but unmeasured in the S3′ harness. Study 1
  showed the harness has **no active goal**, so `c_hat` is never consulted and the claim is **superseded**
  (D.2). The A-GEO null **did hold** — for the corrected reason, not the predicted one.
- **Could it distinguish policy from mechanism?** In this environment, yes trivially — mechanism effects are
  unobservable because E is inert. That is a *limitation stated as a result*, not a success.
- **Could it distinguish geometry from learned evidence?** **Not in Study 1.** Only Study 2 can, and it needs
  seeds we are not authorised to create.
- **What would force rejection of the current interpretation?** A-GEO differing from A-V23 by any amount.

## Q. Recommendation

**CONDITIONAL GO for Study 1 (OQ-2) — NO-GO for Study 2 (OQ-1) at this time.**

Study 1 is fully specified, needs zero production changes, creates no seeds, and turns on a sharp predicted
null. Two items are **under-specified and must be resolved before Pass 2 rather than invented**:

1. **OQ-D1** — whether a same-state counterfactual arm (evaluating both mechanisms at identical states without
   executing) is in scope. It is the strongest available separation of ranking change from trajectory
   divergence, and §P names its absence as this design's main gap.
2. **OQ-D2** — Study 2's environment and seed governance: which M7 arm, which registered range, and who
   authorises the seeds. Study 2 cannot proceed until this is ruled.

V2.3 is not claimed validated, S3.2′(b) is not claimed falsified, and no result here is asserted to make the new
mechanism better or worse.

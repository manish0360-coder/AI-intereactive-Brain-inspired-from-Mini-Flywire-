# GATE-FLOOR-INTERACTION — design report (DESIGN ONLY)

**Status: design proposal for independent review and Director reconciliation. No confirmatory outcome exists; nothing here is
frozen; production `main.js` is not modified; no earlier experiment was rerun.** The only new sessions are the
already-declared 40-world *development* calibration on XFER-1 worlds 0–39 (outside every study world), used as design input.

## 0. Boundary and provenance

| | |
|---|---|
| decision context | GATE-FLOOR-PRODSEM: freeze `cfc1e5c1be1c5f8fc3625701302661e280bbb82e`, results `e60cdc85338d207dd278a5b61d6e5191b5deedbc` |
| evidence preservation | local commit `aac8b6f7d9ca98ca0ff6c99bf5bc3b63132fda2c` (not pushed): archive `blockP_raw_cfc1e5c_e60cdc8.tar.gz`, sha256 `a05a94c98377deac8bfc665d18a10a57251436b1412450f2960528d723d34519`, verified |
| runtime | audited HEAD `0df804c497e649affb9e7ebacb10fdc81ab6de8d`; bare `main.js` sha256 `c92c5c6b…`, PRODSEM derived tree `8cf1dc29…` (floor line + goal-reset probe), calibration guard tree `a0eb7b377dcdf4b9304f0c04c2dd7c3b84328d605b5bd22bc00b534b671dec67` (derived + the two guard lines below) |
| calibration | 40 development worlds (XFER-1 0–39), state P, 8 cells × 40 worlds = 320 test sessions + 40 training sessions; `evidence/calibration_interaction_*.json`; reproducible with `tools/` |

## 1. The question

In block P the real training store (REAL) added **no legal benefit** over cold (+4.1 [−6.7, 14.7]) and, with the floor on, sat
**−27.2 [−34.9, −19.4]** legal reaches below COLD_FLOOR while producing **+49.4** more non-graph goal resets. The
cross-condition difference is an observation, not a mechanism. This design asks whether a runtime legal-edge admission guard
changes that picture, and what the data would have to look like for the "non-graph diversion" explanation to be rejected.

## 2. FACT, INFERENCE, UNKNOWN

### FACT — source level (HEAD, read directly)

| # | fact |
|---|---|
| S1 | HEAD admits a **non-neighbour** candidate when `transitions[from][k] > 5` (`isEpisodeTrained`) or `rewards[from->k] > 4` with an adjacency witness (`isHumanTrained`) (`main.js:1763–1789`); the H1-R **N1-MASK** edit drops every non-neighbour before that test. |
| S2 | N1 as implemented in `experiments/h1r/conformance_transform.mjs` has four parts: MASK (candidate loop), MASK-SEM (goal-free semantic loop), GUARD (executed move must be a graph edge or a self no-op) and SEAL (non-edge consecutive pairs never become episode transitions). HEAD has none of them. |
| S3 | MASK-SEM sits behind `if (goalNeuronId !== null) return;` (`main.js:2589–2590`): **unreachable with a goal set**, so it cannot be a factor level here. SEAL concerns what newly sealed episodes teach, a different pathway, and is not part of the proposed guard. |
| S4 | Autonomous learning writes `transitions` only for graph neighbours (`main.js:4701–4714`); non-graph transitions enter `transitions` through sealed episodes. |
| S5 | `window.lastReasoning` is **never cleared** at HEAD (no `= null` in `main.js`); the H1-R P4 edit that clears it at episode resets is absent. The H1-R README describes N1-GUARD as "backup only; expected never to fire" **in the conformed runtime**. |
| S6 | The anchors apply to HEAD: MASK anchor (`main.js:1789`) and EXEC anchor (`main.js:3641`, with the null-check within 4 lines) each match once. |

### FACT — preserved block-P records (observational, post-hoc; `evidence/association_blockP.json`)

| # | fact |
|---|---|
| B1 | A world's REAL store has 238.3 episodes; **11.5 %** of its consecutive pairs are non-graph; **279 / 280** worlds contain at least one terminal jump-into-goal episode; 3.8 distinct stored shortcut sources per world. |
| B2 | Non-graph goal resets start at a node the store lists as a shortcut source in **66.4 %** (REAL) / 66.7 % (REAL_FLOOR) of cases versus **36.5 %** / 35.8 % in COLD / COLD_FLOOR (no store; the structural baseline); about 13 distinct start nodes per session; the top start node carries ~45 % of non-graph resets. |
| B3 | Per-world Spearman between stored shortcut sources and the REAL_FLOOR − COLD_FLOOR **legal** deficit: **ρ = −0.01 [−0.13, 0.10]**; with terminal non-graph episodes ρ = −0.14 [−0.26, −0.03]; with non-graph pairs −0.03 [−0.15, 0.09]. Against the non-graph-reset change: ρ = +0.25 [0.13, 0.35]. Terciles of stored sources: legal deficit −31.1 / −19.6 / −30.8 (no dose-response), non-graph change +35.7 / +37.7 / +74.4. |

**What B1–B3 do not support:** the simple explanation that shortcut-associated non-graph resets *cause* the legal-reach
deficit. The store raises non-graph resets and concentrates their starts, but the per-world legal deficit does not scale with
stored shortcut content.

### FACT — development calibration (40 worlds; design input, not a claim)

State P, floor and guard crossed with {COLD, REAL} store (the REAL store is each world's own *unguarded* training export,
identical across its four cells). Per-session means, legal / non-graph / all resets:

| cell | legal | non-graph | all | masked candidates | blocked moves |
|---|---|---|---|---|---|
| COLD F0 G0 | 369.1 | 82.7 | 451.8 | 0 | 0 |
| COLD F0 G1 | 395.4 | 0.0 | 395.4 | 1,939 | 26.8 |
| COLD F1 G0 | 451.4 | 68.4 | 519.8 | 0 | 0 |
| COLD F1 G1 | 448.8 | 0.0 | 448.8 | 1,725 | 30.5 |
| REAL F0 G0 | 371.4 | 139.1 | 510.5 | 0 | 0 |
| REAL F0 G1 | 422.8 | 0.0 | 422.8 | 2,009 | 28.2 |
| REAL F1 G0 | 408.1 | 136.3 | 544.5 | 0 | 0 |
| REAL F1 G1 | 454.9 | 0.0 | 454.9 | 1,800 | 31.7 |

* The guard-OFF cells reproduce the committed state-P calibration exactly (COLD 369.1 / 82.7; REAL 371.4 / 139.1).
* **Structural:** guard ON ⇒ non-graph goal resets **0 / 160** sessions and executed non-graph moves **0 / 160**; guard OFF ⇒
  masked and blocked counters 0 (inert); condition integrity ok 320 / 320; audit consistent 320 / 320; default-off
  neutrality (bare HEAD = derived = guard lines present and off = armed-off) identical on 3 / 3 development worlds.
* **Unintended-effect size:** the execution guard fired **29.3** times per session (max 49; ≈ 2 % of the 1,500 calls);
  graph-admitted candidates changed by < 1 % (0.4–0.9 %); 12.4 non-graph candidates reach the admission test per executed non-graph
  move (≈ 1,400–2,000 per session).

Paired contrasts (legal reaches; mean [95 % bootstrap CI], paired SD; n = 40, so intervals are wide):

| contrast | legal | SD | non-graph | all resets |
|---|---|---|---|---|
| floor \| COLD, G0 | +82.3 [59.9, 105.2] | 75.2 | −14.3 | +68.0 |
| floor \| COLD, G1 | +53.3 [32.8, 74.3] | 66.6 | 0 | +53.3 |
| floor \| REAL, G0 | +36.7 [20.7, 53.9] | 54.8 | −2.8 | +33.9 |
| floor \| REAL, G1 | +32.1 [17.1, 49.5] | 53.7 | 0 | +32.1 |
| guard \| COLD, F0 | +26.3 [3.2, 48.9] | 75.3 | −82.7 | −56.4 |
| guard \| COLD, F1 | −2.7 [−16.1, 10.6] | 43.7 | −68.4 | −71.1 |
| guard \| REAL, F0 | +51.4 [34.6, 68.2] | 55.2 | −139.1 | −87.7 |
| **guard \| REAL, F1** | **+46.8 [31.4, 62.5]** | 50.2 | −136.3 | −89.5 |
| store (REAL−COLD) \| F1, G0 | **−43.3 [−62.9, −23.5]** | 64.1 | +67.9 | +24.6 |
| store (REAL−COLD) \| F1, G1 | **+6.2 [−8.3, 20.9]** | 47.4 | 0 | +6.2 |
| **store × guard \| F1** | **+49.5 [28.9, 70.0]** | 67.0 | −67.9 | −18.5 |
| floor × guard \| REAL | −4.6 [−15.0, 5.8] | 34.6 | +2.8 | −1.9 |
| floor × guard \| COLD | −29.0 [−54.8, −3.1] | 84.3 | +14.3 | −14.7 |
| store × floor \| G0 | −45.6 [−70.4, −21.3] | 81.9 | +11.5 | −34.1 |
| 3-way store × floor × guard | +24.4 [−2.3, 52.1] | 89.4 | −11.5 | +12.8 |

Per goal group (10 worlds each, descriptive): the guard effect at REAL, F1 is positive in all four goals (+22.5 … +66.6) and the
F1 store deficit moves from −29.7 … −57.7 under G0 to −13.3 … +15.1 under G1.

### INFERENCE (each with its basis and its limit)

1. **The guard, as a bundle, is associated in the development sample with removal of the real-store deficit and with a real
   legal-reach gain in the real-store cells** (interaction +49.5; guard | REAL, F1 +46.8). This is an *interventional* contrast on
   the bundle (same worlds, same seeds, same delivered store), unlike B1–B3; its limit is n = 40 and the bundle (S2: mask + exec).
2. **In the cold+floor cell the guard changes the reset accounting, not performance** (legal −2.7 [−16.1, 10.6] while non-graph
   −68.4 and all resets −71.1): there the removed resets were non-graph and the legal count did not move.
3. **The PRODSEM headline contains some re-classification.** Under G0 the floor lowers non-graph resets by 14.3 in cold worlds
   and raises legal by 82.3; under G1 the cold floor effect is +53.3 (floor × guard | COLD −29.0 [−54.8, −3.1]).
4. B3 and (1) are compatible only if the channel the guard closes is broader than "stored terminal shortcuts into the goal":
   12.4 non-graph candidates per executed non-graph move reach admission, and the exec guard blocks ~29 stale or other illegal
   executions per session. **This reading is a hypothesis, not a result.**

### UNKNOWN (not resolved here; each is carried as a claim limit)

* Which component carries the bundle effect — MASK (admission) vs EXEC (stale-reasoning and other illegal executions; S5 makes
  stale pre-reset reasoning a candidate source of the ~29 blocked moves, **unverified**).
* Whether the legal deficit is mediated by the non-graph channel *at all* in the confirmatory sample (the development result is
  n = 40; B3 points the other way).
* What else in a real store reduces legal reaches (long legal loops, Q-values, replay order).
* The guard's effect when the store itself is trained under the guard (the production-relevant scope if the guard shipped).
* Behaviour without the 150-tick cap, beyond 1,500 calls, on other goals or graphs; anything about production equivalence.

## 3. Proposed design: a paired 2 × 2 × 2 factorial, nothing else

**Factors (all within world; one training session per world; same test seed and configuration for all eight cells):**

| factor | levels | implementation |
|---|---|---|
| S — store | COLD (no store) / REAL (the world's own cold training export, trained **unguarded** under state P) | existing `loadBrain()` single-read delivery |
| F — floor | OFF / ON | the frozen PRODSEM floor line (unchanged) |
| G — legal-edge guard | OFF / ON | two guarded, default-off, call-only lines in the derived tree: ADMIT (before `main.js:1789`: counts the candidate class and, when ON, drops non-graph candidates = N1-MASK semantics) and EXEC (before `main.js:3641`: blocks a non-edge, non-self executed move and counts it = N1-GUARD semantics) |

Hook state P for every session (arm OFF / envMode off / creditMode off / pin off), exactly as PRODSEM. **The store is trained
once, unguarded**, so the guard contrast isolates *admission/execution* with the delivered content fixed.

**Cells (8) and why each is present — every cell enters at least one declared estimand:**

| cell | role |
|---|---|
| COLD F0 G0 | baseline; internal reproduction of the PRODSEM cold-floor effect (instrument I6) |
| COLD F1 G0 | PRODSEM floor effect; store-deficit reference at G0 |
| COLD F1 G1 | store-deficit reference at G1 (the explanatory contrast) |
| COLD F0 G1 | guard effect without floor / store; required for the 3-way interaction only |
| REAL F0 G0 | production-like baseline for a real-store agent |
| REAL F1 G0 | PRODSEM REAL_FLOOR; floor persistence, deficit at G0 |
| REAL F0 G1 | guard without floor; floor persistence at G1 |
| REAL F1 G1 | the candidate production package; deficit at G1 |

**Smaller design considered and not chosen:** a 6-cell design (drop COLD F0 G0 and COLD F0 G1) still answers questions 1–3 and
the store×guard interaction at F1, but loses the 3-way interaction (explicitly asked), the within-block replication of the
PRODSEM floor effect (the only instrument that tells a null result from a broken block) and guard | COLD, F0. Cost of the two cells:
+33 % sessions. If the review prefers D6, the primary family below is unchanged.

**Not included, with reasons:** an ENTRY_NR arm (no ceiling question here); a guard-only-mask arm (component attribution is a
follow-up that needs this result first); a store with its non-graph pairs removed (a different manipulation of the same
hypothesis, to run only if the guard result is inconclusive); a store trained *under* the guard (the production-scope question;
deferred); N1-SEAL / P4 (different pathways).

## 4. Estimands, decisions, instruments

Outcome: **legal goal reaches per 1,500-call test session** is primary for every claim. Non-graph resets and total resets are
reported separately for every contrast and cell and are never merged into the primary. Paired by world; 95 %-family percentile
bootstrap, 10,000 resamples, seed 20261014 (as in PRODSEM); absolute margin **δ = 20 legal reaches** (≈ 4.4 % of the
cold-floor level; the PRODSEM DELTA). Notation: Y(S,F,G) per-world legal reaches; τ_G(S,F) = Y(S,F,1) − Y(S,F,0);
τ_F(S,G) likewise; Δ_SG(F) = τ_G(REAL,F) − τ_G(COLD,F); D_g = Y(REAL,1,g) − Y(COLD,1,g).

### Primary family (three claims, decisive intervals at the Bonferroni-3 level, 98.33 %)

| claim | estimand | rule |
|---|---|---|
| **PC1 — does the guard remove the real-store deficit?** | Δ_SG(F=1) = D_1 − D_0 | **RECOVERY_FULL**: lower bound ≥ δ **and** D_1 lower bound > −δ; **RECOVERY_PARTIAL**: lower bound ≥ δ otherwise; **NO_RECOVERY**: upper bound < δ; else INCONCLUSIVE. *Precondition I5*: upper bound of D_0 < 0 (a deficit exists to explain), else NOT_TESTABLE. |
| **PC2 — does the guard improve legal reaches or only the accounting?** | τ_G(REAL, F=1) | **IMPROVES**: lower bound ≥ δ; **HARMS**: upper bound ≤ −δ; **ACCOUNTING_ONLY**: interval inside (−δ, δ) (non-graph resets removed, legal unchanged); else INCONCLUSIVE. |
| **PC3 — does the floor benefit persist with the real store?** | τ_F(REAL, G=0) and τ_F(REAL, G=1) | **PERSISTS** iff both lower bounds ≥ δ; otherwise ONLY_WITHOUT_GUARD / ONLY_WITH_GUARD / NOT_PERSISTENT. |

### Instruments (block-level; a failing instrument voids only the claims that depend on it)

| id | gate | voids |
|---|---|---|
| I1 | condition integrity P in every session (as PRODSEM) | everything |
| I2 | floor audit in every F1 session (never lowers, goal-neighbour legal edges only) | PC1–PC3 |
| **I3** | **guard completeness: non-graph resets = 0 and executed non-graph moves = 0 in every G1 session; maskedOut = blockedIllegal = 0 in every G0 session** | PC1, PC2 |
| I4 | default-off neutrality of the added lines (gate-level: bare = derived = lines-present-off = armed-off on decisions, transitions, RNG draws, Q/credit state, end-state hash) and candidate-level scope test (first G1/G0 candidate difference is a dropped non-graph candidate) | PC1, PC2 |
| I5 | the real-store deficit reproduces at G0 in this block (upper bound of D_0 < 0) | PC1 |
| I6 | cold floor effect reproduces: lower bound of τ_F(COLD, G=0) ≥ 40 (the PRODSEM MIN_BENEFIT) | PC3 |
| I7 | delivered store identical across a world's four REAL cells (episode-array hash) and equal to its training export; same seeds/configuration across all eight cells | everything |

### Secondary (descriptive, nothing gates on them; unadjusted 95 % intervals with their MDE stated)

guard | COLD,F0 and COLD,F1; store×guard | F0; floor×guard | COLD and | REAL; store×floor | G0 and | G1; the **3-way**; the
store deficit at F0; every contrast on non-graph and on total resets; per-goal versions of PC1–PC3.

### Goal-specific harm and unintended effects

* **Per-goal harm** (70 worlds per goal): for each of τ_G(REAL,F1), τ_F(REAL,G0) and τ_F(REAL,G1) the unadjusted 95 % interval
  of a goal group wholly below 0 is a HARM flag attached to that claim (PRODSEM's rule); a flagged claim cannot be reported as
  unqualified.
* **Candidate-selection diagnostics** (descriptive, no claim rests on them; two declared FLAGS): per-session candidate classes
  reaching admission (graph / non-graph trained / human-trained / both), masked count, **blocked-move count (FLAG if > 5 % of
  calls; development mean 2.0 %)**, executed-move composition (legal / non-graph / self / none), **graph-admitted candidate
  count (FLAG if the guard changes it by > 5 %; development < 1 %)**, distinct goal edges used per session, end-state goal-edge
  shortcut penalty.

## 5. Falsification and decision map

| outcome | reading |
|---|---|
| PC1 = NO_RECOVERY (with I3, I5 valid) | **falsifies** "the legal deficit runs through the admission/execution channel the guard closes" (as a bundle). The deficit is then attributable to something the guard does not touch; the next step is a store-content manipulation, not a production change. |
| PC2 = ACCOUNTING_ONLY | the guard cleans the reset accounting without improving legal reaches: a hygiene decision, not a performance one. |
| PC1 ≥ RECOVERY_PARTIAL and PC2 = IMPROVES | the bundle explanation is supported **for the bundle only**; component attribution (mask vs exec) stays UNKNOWN. |
| PC2 = HARMS or any HARM flag | the guard is excluded from any package. |
| PC3 ≠ PERSISTS | the floor is not specified for real-store agents without further work. |

**What would justify writing a separate production-design specification** (design-only; implementation remains a separate
authorization): PC3 = PERSISTS **and** PC2 ≠ HARMS **and** no HARM flag **and** I1–I4, I7 hold. The specified package is
floor + guard iff PC2 = IMPROVES; floor alone otherwise. A spec for a guard whose training scope is unresolved must say so.

## 6. Sample size, multiplicity, stopping rule

* **Sample:** 280 fresh worlds (70 per goal 8/12/16/19; indices 1112–1391, ascending accepted-configuration stream beyond
  PRODSEM's 832–1111; seed governance unchanged); 8 test sessions + 1 training session per world = **2,520 sessions**
  (≈ 45–50 min at 10 workers, extrapolated from PRODSEM's 1,680 sessions in 29 min 52 s).
* **Rule:** n ≥ ((z₁₋α/2 + z₀.₈₀)·SD/δ)² with δ = 20, SDs from the paired development contrasts above, decisive α = 0.05/3.

| contrast | SD (dev) | n at 95 % | n at Bonf-3 | n at Bonf-3, SD × 1.25 | MDE at n = 280 (Bonf-3) |
|---|---|---|---|---|---|
| store × guard \| F1 (PC1) | 67.0 | 88 | 118 | 184 | 12.9 |
| guard \| REAL, F1 (PC2) | 50.2 | 50 | 67 | 104 | 9.7 |
| floor \| REAL, G0 / G1 (PC3) | 54.8 / 53.7 | 59 / 57 | 79 / 76 | 123 / 118 | 10.6 / 10.4 |
| 3-way (secondary) | 89.4 | 157 | 210 | 328 | 17.3 |
| largest secondary (store, REAL − COLD \| F0, G0) | 98.4 | 191 | 254 | 397 | 19.0 |

n = 280 covers every primary contrast with a 25 % SD inflation (184 ≤ 280) and every secondary at the stated SD (≤ 254), and
keeps 70 worlds per goal for the harm rule; at a 25 % SD inflation the secondaries (to 397) would be under-powered, which is why
nothing gates on them. **Assumptions stated:** the 40-world SDs are point estimates (SE ≈ 11 %); the
effects of interest are ≥ 20; independence across worlds; a normal-approximation sizing of a percentile-bootstrap analysis.
No parameter (δ, margins, n, arms) is chosen from the new block's outcomes.
* **Multiplicity:** primary family = {PC1, PC2, PC3}, decisive at Bonferroni-3; the unadjusted 95 % classification is reported
  as a non-decisive sensitivity; secondaries are descriptive with their MDE.
* **Stopping rule (fixed):** all 280 worlds × 8 cells run; no interim analysis, no optional stopping, no extension, no
  outcome-based exclusion; a failed session is retried once, then its world is excluded (condition-integrity or guard-completeness
  violations count as failures); > 10 % excluded → the block is INVALID; one frozen analysis script.

## 7. Claim limits

State P; the 150-tick cap, deterministic replay and legacy stale-keyed credit remain (PRODSEM limits); the guard is the N1
mask + execution guard as implemented (not full N1: no SEAL, no P4, no MASK-SEM); the delivered store is trained unguarded;
Phase I, 1,500 calls, goals {8, 12, 16, 19}. A result would not establish production equivalence, routing capability,
cognition, or the guard's behaviour when the agent's whole history is guarded.

## 8. What happens next (not done here)

Gemini review (`research/external/GATEFLOORINTERACTION_GEMINI_DESIGN_REVIEW_PACKAGE.md`) → Director reconciliation →
(only then) freeze: `config.mjs`, session/orchestrator/analysis forks of PRODSEM, a gate with the I3/I4 checks and mutants,
freeze commit pushed and remote-verified, execution, results commit.

## 9. FREEZE ADDENDUM (written before any confirmatory outcome exists)

**Review and authorization.** Independent review (Gemini): PASS WITH CLAIM LIMITS, one required correction. Research Director:
correction, freeze and confirmatory execution authorized. The addendum records the correction and the implementation choices that
the reviewed text left open; **no scientific parameter of §3–§7 changed** (δ = 20, 8 cells, 280 worlds / 70 per goal, family of
three at Bonferroni-3, instruments I1–I7, fixed stopping).

1. **The required correction (S5).** `static_checks.mjs` `lastReasoningInvariant(text)`: after comments are stripped it collects
   every write-like operation on `lastReasoning` (plain / compound / logical assignment, `window.` / `globalThis.` / `self.`
   qualified, bare and bracket forms; `delete`; `Object.defineProperty` / `Reflect.set`-style redefinition; property writes; `++`/`--`)
   and requires exactly one write — an assignment whose right-hand side opens an object literal (HEAD `main.js:2765`). It is
   asserted on three **pinned, built** sources (bare HEAD `c92c5c6b…`, PRODSEM derived `8cf1dc29…`, guard tree `a0eb7b37…`), not on
   a working-tree copy. Mutation tests M5–M8 insert a clearing operation (`= null` at the goal-reset anchor, `delete`,
   `globalThis… = undefined` and bracket forms, a property reset) and each must fail the invariant; M9 shows a comment and a read
   are not flagged. Limit: comment stripping is a heuristic, so the check is a drift detector for the pinned sources, not a parser.
2. **Implementation choices fixed at freeze (not in the reviewed text; none uses an outcome).**
   * Instruments I5 and I6 use the **unadjusted 95 %** interval (they are validity gates, not claims); the primary family uses the
     Bonferroni-3 interval (98.33 %); the unadjusted classification of the family is a declared non-decisive sensitivity.
   * A session whose **condition integrity or guard completeness is violated is a failed session**: retried once, then its world is
     excluded; > 10 % excluded → INVALID. Block-level: I1/I7 failure → INVALID; I2 → every primary claim VOID; I3 → PC1 and PC2
     VOID; I6 → PC3 VOID; I5 → PC1 NOT_TESTABLE.
   * PC2 `ACCOUNTING_ONLY` additionally requires the guard to have removed ≥ δ non-graph resets (otherwise `NEGLIGIBLE`).
   * Guard completeness is recomputed from raw numbers in the analysis (G1: non-graph resets 0, executed non-graph moves 0, nothing
     admitted; G0: masked 0, blocked 0); the session's own flag is not trusted.
   * The two guard lines are pinned by content (`GUARD_TREE` in `config.mjs`); the guard tree rebuilt from the committed transform
     is byte-identical to the calibration tree.
   * 19 secondary contrasts are listed in `analyze.mjs` with their MDE (2.802·SD/√n); nothing gates on them.
3. **Claim scope (mandatory).** The intervention is the **combined admission-mask + execution-guard bundle**; no effect is
   attributed to either component. A supported result can justify a production-design *specification* only; it is not a
   production change and not production readiness. The M7-bounded transition, 150-tick episode cap, deterministic replay,
   legacy stale-keyed credit, unguarded store training and generalization limits of §7 stay explicit.
4. **Backup risk.** The block-P raw archive has one local copy (12.4 MB, sha256 `a05a94c9…`); it is preserved and verified, not
   redesigned here. The new block's raw output will be archived the same way and carries the same single-copy limit.
5. **Verifier corrections made while freezing (no protocol change).** The first gate run failed one scope check and missed three
   mutants; all three were defects of the *verifier*, corrected before the freeze: (a) the candidate-level scope test assumed the
   first stream difference is always a masked candidate — the recorded first guard action is a **blocked execution at call 57**
   and the first candidate-level difference is at call 58, so the test now asserts that nothing differs before the first guard
   action (mask or block) and that a first action that is a mask removes a non-graph candidate; (b) mutant M3 (mask placed after
   the admission test) was functionally equivalent and was replaced by a mask that counts but does not drop, which the
   guard-on behaviour exposes — **note:** because the execution guard still blocks illegal moves, the I3 completeness record alone
   cannot see a mask that fails to drop; the pinned guard-tree hash, gate checks L1/M3 and the descriptive per-session `maskedOut`
   export cover it, and no analysis rule was changed for this; (c) two mutant fixtures were tuned (a goal group whose interval
   straddles zero; a shared-seed violation).

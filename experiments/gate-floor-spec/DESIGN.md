# GATE-FLOOR-SCOPE — floor + guard production-design specification (DESIGN ONLY)

**Status: design proposal for independent review and Director reconciliation. Nothing here is frozen; no confirmatory outcome
exists; production `main.js` is not modified; no earlier experiment was rerun.** The only new sessions are *development*
calibrations on XFER-1 worlds 0–29 (outside every study world), used as design input, and they are labelled as such.

## 0. Provenance and boundary

| | |
|---|---|
| evidence in hand | GATE-FLOOR-INTERACTION freeze `80f83ad3dcc3bd008c841ee712318280b5a5db66`, results `43cfd195063a0473f944e72f383ba8e6aa03c883` |
| milestone A (backup) | `06efc5bcc9da0f32a9bb94661e9176883996479a` — no off-machine copy of the raw archives exists; limitation + next step documented (`research/evidence_backup/`) |
| tooling fix | `5dda4c5334a70ca0560e5760e23b9c068008a172` — two evidence tools had lost `S`/`U` definitions; fixed and smoke-tested |
| runtime / tree | audited HEAD `0df804c…`; guard tree `main.js` sha256 `a0eb7b377dcdf4b9304f0c04c2dd7c3b84328d605b5bd22bc00b534b671dec67` (**unchanged: no new tree line is proposed**) |
| development calibration | 30 XFER-1 worlds × (2 training + 6 test) sessions, state P, floor ON at test: `evidence/calibration6_*.json`; structural checks `evidence/components_feasibility_devworlds_1_3.txt`, `evidence/stale_reasoning_devworlds_0_7.txt`; reproducible from `tools/` |

## 1. The two questions

* **Q1 (training scope).** Does the floor + guard bundle remain beneficial when the training store itself is accumulated under the
  guard?
* **Q2 (component separability).** Can the admission mask and the execution guard be separated sufficiently to decide whether one of
  them can be omitted?

## 2. Evidence, kept apart

### FACT — source and structure

| # | fact |
|---|---|
| S1 | The two pinned guard lines are independent: ADMIT calls `__GFGUARD__.admit(...)` and the object decides; EXEC reads `__GFGUARD__.on`. **A driver-level flag pair (`maskOn` for `admit`, `on` for EXEC) therefore separates the components with the tree and its pins unchanged.** |
| S2 | `window.lastReasoning` is never cleared at HEAD (static invariant S5, pinned on bare / derived / guard sources); the H1-R P4 edit that clears it at resets is absent. |
| S3 | A *decision* is a `lastReasoning` record `{from, to}`; an *execution* uses `lastReasoning.to` from the agent's current position. A reasoning whose `from` differs from the current position is **stale**. |

### FACT — development calibration (floor ON; n as stated; design input, not a claim)

Non-graph goal resets by origin (8 dev worlds, cold store): **unguarded 60.9 = 25.8 stale-reasoning + 35.1 non-edge decisions**
(77.3 executed non-graph decisions); **mask-only 30.4 = 30.4 stale + 0.0 decisions** (0 non-graph decisions). The mask removes the
decision channel completely and does not touch the stale channel.

Six-cell calibration (30 dev worlds, REAL stores; per-session means):

| cell | store / test guard | legal | non-graph | total | masked | blocked |
|---|---|---|---|---|---|---|
| U_off | unguarded / off | 420.5 | 125.2 | 545.6 | 0 | 0 |
| U_mask | unguarded / mask only | 469.0 | 30.9 (all stale) | 499.9 | 1,658 | 0 |
| U_exec | unguarded / exec only | **326.5** | 0 | 326.5 | 0 | **448.8** |
| U_both | unguarded / bundle | 460.9 | 0 | 460.9 | 1,859 | 31.4 |
| G_off | guard-trained / off | 428.4 | 124.2 | 552.6 | 0 | 0 |
| G_both | guard-trained / bundle | 450.2 | 0 | 450.2 | 1,652 | 32.1 |

| contrast (legal; mean [95 % CI]; paired SD) | n = 30 |
|---|---|
| retrofit: bundle on a legacy store (U_both − U_off) — replicates Block I | +40.4 [22.9, 57.8]; 50.3 |
| **scope:** guard-trained vs legacy store, bundle at test (G_both − U_both) | **−10.7 [−30.8, 8.9]**; 57.1 |
| **package:** guard-trained + bundle vs legacy + floor (G_both − U_off) | **+29.7 [2.6, 54.7]**; 74.7 |
| mask-only effect (U_mask − U_off) | +48.5 [31.1, 66.5]; 50.4 |
| **exec-only effect (U_exec − U_off)** | **−94.0 [−114.7, −72.1]**; 59.2 |
| **mask-only vs bundle (shortfall U_both − U_mask)** | **−8.1 [−17.8, 2.1]**; 28.5 |
| exec-only vs bundle (shortfall U_both − U_exec) | +134.4 [106.9, 160.3]; 75.4 |
| clean store without a runtime guard (G_off − U_off) — mechanistic only | +7.9 [−17.5, 32.3]; 70.6 |

Structure: bundle cells 30/30 zero non-graph resets; exec-only cells 30/30 zero non-graph resets; mask-only cells 30/30 zero
non-edge decisions; guard-off cells 30/30 inert counters; integrity and audit 180/180. **Guard-trained stores still contain
non-graph consecutive pairs: 25.8 per store (3.5 % of pairs) versus 100.6 (14.2 %) in unguarded stores, and 7.8 versus 40.6
terminal jump-into-goal episodes, although every guard-training session had 0 non-graph resets.** Store sizes are comparable
(episodes 229.9 vs 236.2; ratio 0.98, range 0.69–1.14).

### FACT — Block I (frozen, remote-verified)

Bundle effect with a legacy real store under the floor +28.1 [21.9, 34.6] (cold +21.0); floor benefit persists with the real store
(+40.6 / +33.3); store × guard interaction +7.1 [−2.0, 16.1]; the real-store deficit is mostly floor × store sub-additivity
(store × floor −29.6 [−40.1, −19.1]).

### INFERENCE (with basis and limit)

1. **The mask is necessary, the execution guard alone is harmful.** Exec-only blocked 449 ticks per session (30 % of calls) and 394
   non-graph decisions per session: the agent keeps re-deciding moves that are then refused, and legal reaches fall by 94. (Basis:
   dev, n = 30, floor ON; the mechanism of the re-selection is not isolated.)
2. **The two components close different channels.** The mask closes the decision channel (admitted non-graph shortcuts); the
   execution guard is the only thing that closes the stale-reasoning channel (≈ 31 non-graph goal resets per session survive the
   mask). In legal-reach terms mask-only is **not worse** than the bundle (the bundle falls short of it by −8.1 [−17.8, 2.1]); the
   bundle's extra value is completeness (0 illegal executions), at a cost of ≈ 31 blocked ticks (2 % of calls).
3. **Training under the guard looks neutral on this evidence** (scope −10.7 [−30.8, 8.9]; clean store without a runtime guard +7.9
   [−17.5, 32.3]). With n = 30 this cannot separate "neutral" from "±20".
4. The stale channel is a defect of the runtime (a reasoning not cleared at a reset), so a **source-level fix** (clear it at the
   reset sites — the H1-R P4 edit) is a design alternative to the execution guard that would not waste ticks. **Untested.**

### UNKNOWN

* Why guard-trained stores retain non-graph pairs although no non-graph reset occurred in their training (origin not isolated).
* Component attribution when the *store* is trained under mask-only or under the bundle; floor-in-training (stores here are trained
  with the floor off, as in Block I); any behaviour beyond the M7 bounds (state P, 150-tick cap, deterministic replay, legacy credit,
  Phase I, 1,500 calls, goals {8, 12, 16, 19}).
* Whether the dev-sample signs (mask-only ≥ bundle; scope ≈ 0) hold at n = 280.

## 3. Candidate designs, compared by the decision each can support

All designs: paired by world, hook state P, floor ON at test, store trained with the floor OFF, one test seed per world.

| design | cells | trainings | sessions / world | n = 280 | supports | cannot support |
|---|---|---|---|---|---|---|
| **E** end-to-end only | U_off, G_both | 2 | 4 | 1,120 | the package effect (PS2) | whether it is the guard *history* or the runtime guard; any component decision |
| **A** scope only | U_off, U_both, G_both | 2 | 5 | 1,400 | Q1 (PS1, PS2) | Q2 |
| **B** components only | U_off, U_mask, U_exec, U_both | 1 | 5 | 1,400 | Q2 | Q1 |
| **C** joint (**proposed**) | U_off, U_mask, U_exec, U_both, G_both | 2 | 7 | **1,960** | Q1 and Q2 with shared cells | component × scope interaction; floor-in-training |
| **D** full {U, G} × {off, mask, exec, both} | 8 | 2 | 10 | 2,800 | everything above plus component × scope | nothing needed beyond the two questions |

Running A and B as separate blocks costs 2,800 sessions against C's 1,960 because C shares U_off and U_both. D adds three cells that
serve only an interaction nobody has asked for. **G_off** (guard-trained store, guard off at test) is excluded from every design:
it is not a production scenario (a guard is a runtime property that is either shipped or not) and the dev contrast is null; it
would answer a mechanistic question only. **U_exec** is retained in C as a *diagnostic* cell (it decides "the mask cannot be
omitted"); the review is asked whether the 280 sessions are worth it (design C′ = C without U_exec: 1,680 sessions).

## 4. The proposed design C (GATE-FLOOR-SCOPE)

**Placement and sharing.** Per world: two independently trained cold stores from the same world, configuration and training seed —
**U** (guard off, floor off; as Block I) and **G** (guard *bundle* on, floor off). Each store is shared by every test cell that uses
it (U by four cells, G by one); the test seed and configuration are identical across the five test cells. Stores are *not* shared
across regimes (that would remove the manipulation) and *not* trained separately per cell (that would add training noise to the
component contrasts, which compare cells on the same store). Test: floor ON, hook state P, 1,500 calls.

**Cells** (test guard setting is a driver-level flag pair on the pinned tree: `mask` = `maskOn` only, `exec` = `on` only,
`both` = both):

| cell | store | test guard | role |
|---|---|---|---|
| U_off | U | off | production-like legacy + floor (the comparator of the package) |
| U_both | U | bundle | Block I's REAL_F1_G1; retrofit; comparator for scope and for the components |
| G_both | G | bundle | the whole history guarded |
| U_mask | U | mask only | exec-omission candidate |
| U_exec | U | exec only | diagnostic: mask-omission |

**Worlds and size.** 280 fresh worlds (indices 1392–1671, 70 per goal 8/12/16/19; the same ascending accepted-configuration
stream; seed governance unchanged), 2 training + 5 test sessions each = **1,960 sessions** (≈ 45 min at 10 workers).

## 5. Estimands, labels and decision rules

Outcome: **legal goal reaches per 1,500-call test session**; non-graph resets, total resets and the stale/decision split of
non-graph resets are reported separately for every cell and contrast. Percentile bootstrap, 10,000 resamples, seed 20261014, paired
by world; margin **δ = 20** (≈ 4.4 % of the floor level). Notation: Y(T, M) with T ∈ {U, G} the training regime and M the test
guard.

| id | estimand | labels (decisive at Bonferroni-3, 98.33 %) |
|---|---|---|
| **PS1 scope** | Y(G, both) − Y(U, both) | SCOPE_BENEFIT (lb ≥ δ) · SCOPE_HARM (ub ≤ −δ) · SCOPE_NEUTRAL (interval inside (−δ, δ)) · INCONCLUSIVE |
| **PS2 package** | Y(G, both) − Y(U, off) | PACKAGE_IMPROVES (lb ≥ δ) · PACKAGE_HARMS (ub ≤ −δ) · PACKAGE_NEUTRAL · INCONCLUSIVE |
| **PS3 exec omission (performance)** | σ_M = Y(U, both) − Y(U, mask) | MASK_SUFFICES (ub < δ) · MASK_SUPERIOR (ub ≤ −δ) · MASK_FALLS_SHORT (lb ≥ δ) · INCONCLUSIVE |
| D1 mask necessity (diagnostic, unadjusted 95 %) | σ_X = Y(U, both) − Y(U, exec) | MASK_NECESSARY (lb ≥ δ) · NOT_ESTABLISHED |
| D2 retrofit replicate (instrument) | Y(U, both) − Y(U, off) | lb (95 %) > 0 |

Descriptive companions (never gating): stale share of non-graph resets under mask-only (X1; dev 100 %); store diagnostics
(episodes, non-graph pairs, terminal jump-into-goal episodes, training legal/non-graph reaches) for both regimes; the exec-only
blocked-tick share; Y(U, mask) − Y(U, off), Y(U, exec) − Y(U, off); per-goal versions of PS1–PS3.

**Completeness is not a statistical claim.** MASK_SUFFICES establishes performance only. Omitting the execution guard additionally
leaves ≈ 31 stale-channel non-graph resets per session (dev), which are counted as goal resets but are not legal reaches: whether
that residual is acceptable is a **product decision for the owner**, not something a margin decides.

### Instruments (a failing instrument voids only the claims named)

I1 condition integrity P in every session (all claims) · I2 floor audit in every test session (all) · **I3 guard completeness per
cell type**: bundle cells — 0 non-graph resets, 0 executed non-graph moves, 0 admitted non-graph candidates; U_mask — 0 non-graph
*decisions*, 0 decision-origin non-graph resets, masked > 0, blocked = 0; U_exec — 0 non-graph resets, masked = 0, blocked > 0;
U_off and the U training sessions — masked = blocked = 0; the G training sessions — the bundle's completeness (PS1, PS2, PS3) ·
**I4 default-off neutrality and mode isolation** (gate level: bare = derived = guard-lines-present-off = armed-off, and each flag
reaches only its own line: mask-only leaves EXEC inert, exec-only leaves ADMIT counting only; guard-tree sha256 `a0eb7b37…`
unchanged) (PS1–PS3) · **I5 training fidelity**: the G training records show the bundle on and the floor off and the U records
guard off; same training seed and configuration for U and G (PS1, PS2) · I6 D2 (PS2) · I7 pairing and store identity: the U store
identical across its four test cells, the G store used only by G_both, one test seed per world (all) · I8 store diagnostics —
**FLAG** if the G store has a *larger* non-graph pair share than the U store (the training placement did not act).

### Goal-specific and candidate-selection checks

Per goal (70 worlds, unadjusted 95 %): a goal group whose interval of PS1 or PS2 lies wholly below 0 is a HARM flag; a group whose
σ_M has lb ≥ δ is a MASK_FALLS_SHORT flag. Candidate-selection diagnostics, descriptive with two flags (as Block I): blocked share
of calls in bundle and mask cells > 5 %, graph-admitted candidate count changed by > 5 %; executed-move composition; distinct goal
edges; end-state goal-edge penalty.

### Training-store confounding (declared handling)

The guard changes the whole training trajectory, so U and G stores differ in content *and* size: PS1 and PS2 estimate the **total
effect of the training regime**, not an effect of "store cleanliness". Controls: same world, configuration and training seed;
shared-within-regime stores; the construct and size diagnostics above recorded for every world; a descriptive, observational
check of whether per-world PS1 tracks the per-world difference in non-graph pairs or episodes (no mediation claim). Residual
non-graph pairs in G stores are a known, unexplained feature (UNKNOWN).

## 6. Sample size, multiplicity, stopping

n ≥ ((z₁₋α/2 + z₀.₈₀)·SD/δ)², δ = 20, decisive α = 0.05/3 (z = 2.394 + 0.842), SDs from the 30-world calibration; a 25 % SD
inflation for the uncertainty of an n = 30 SD estimate.

| contrast | SD (dev) | n | n at SD × 1.25 | MDE at n = 280 (Bonf-3) |
|---|---|---|---|---|
| PS1 scope | 57.1 | 86 | 134 | 11.0 |
| PS2 package | 74.7 | 147 | 229 | 14.4 |
| PS3 mask-only vs bundle | 28.5 | 22 | 34 | 5.5 |
| D1 exec-only vs bundle (unadjusted 95 %) | 75.4 | 112 | 175 | 12.6 |

n = 280 covers every primary contrast with the 25 % inflation (229 ≤ 280) and keeps 70 worlds per goal for the harm checks.
Assumptions stated: SDs are n = 30 point estimates (SE ≈ 13 %); independence across worlds; normal-approximation sizing of a
bootstrap analysis; effects of interest ≥ δ. **Multiplicity:** the primary family is {PS1, PS2, PS3} at Bonferroni-3; D1 and the
descriptive companions use unadjusted 95 % intervals and gate nothing. **Fixed stopping rule:** all 280 worlds × 5 cells and both
trainings run; no interim analysis, no extension, no optional stopping, no outcome-based exclusion; a failed session (including an
integrity or completeness violation) is retried once, then its world is excluded; > 10 % excluded → the block is INVALID; one
frozen analysis; no parameter (δ, n, cells, rules) is chosen from the new block.

## 7. What each outcome means

| outcome | reading |
|---|---|
| PS2 = PACKAGE_IMPROVES, PS1 ≠ SCOPE_HARM, no HARM flag, I1–I7 hold | **justifies writing the production-design specification** of the floor + guard package. PS1 = SCOPE_NEUTRAL → the guard need not predate the store (retrofit suffices within δ); PS1 = SCOPE_BENEFIT → specify the guard from the first run. |
| PS1 = SCOPE_HARM | do **not** train under the bundle; the retrofit-only form is the specification candidate |
| PS3 ∈ {MASK_SUFFICES, MASK_SUPERIOR} and D1 = MASK_NECESSARY | mask-only is performance-sufficient; recommending it additionally needs the owner's explicit acceptance of the residual stale-channel resets (or a source-level fix of the stale channel, UNKNOWN) |
| PS3 = MASK_FALLS_SHORT | keep the bundle |
| D1 ≠ MASK_NECESSARY | the dev finding "the mask cannot be omitted" is **falsified**; Q2 reopens |
| **falsifies** "training under the guard changes the bundle's yield by ≥ δ" | PS1 = SCOPE_NEUTRAL |
| **falsifies** "the execution guard contributes ≥ δ legal reaches beyond the mask" | PS3 ∈ {MASK_SUFFICES, MASK_SUPERIOR} |
| **falsifies** "the stale channel is what the mask leaves behind" | X1 (stale share of mask-only non-graph resets) < 90 % |

## 8. Claim limits

State P; 150-tick cap; deterministic replay; legacy stale-keyed credit; one cold training session of 1,500 calls per store, floor off
in training; the guard in the *bundle* form for training; mask-only/exec-only tested on legacy stores only; Phase I, 1,500 calls,
graph and goals {8, 12, 16, 19}. Not production equivalence or readiness, routing capability or cognition. The bundle effect is not
attributed to either component except through the explicit PS3/D1 contrasts.

## 9. Not included, and why

Floor-in-training (changes the store through a different mechanism; deferred); mask-only- or exec-only-trained stores (component ×
scope interaction; not needed for either question); G_off (mechanistic, not a production scenario); a store with non-graph pairs
removed (a different manipulation of the same hypothesis, only if PS1 is informative and the pairs matter); a source-level fix of
the stale channel (new tree line, new neutrality evidence — a separate follow-up if the execution guard's tick cost matters).

## 10. Open issues for review

1. Is the bundle the right training regime for G, given that the residual non-graph pairs in G stores are unexplained?
2. Is U_exec worth 280 sessions (design C′ drops it and relies on the mechanism + the dev effect −94)?
3. Is δ = 20 the right margin for scope (neutrality would be declared inside ±20)?
4. Is PS3 sufficiently separated from the completeness question, and is "product decision" the right place for the residual?
5. Should floor-in-training be crossed now (it would double the training regimes) or stay deferred?

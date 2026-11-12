# GATE-FLOOR-SCOPE — design-review package (self-contained; no repository access needed)

**What I need from you.** One focused adversarial review of a **design only**. Nothing is frozen; no confirmatory outcome exists;
production code is untouched. You do not implement or run anything. Judge: the causal estimands, intervention fidelity,
training-store confounding, component attribution, power, multiplicity and claim scope (§3–§8), and answer §9 in the format of §10.
Do not reopen closed GATE-FLOOR milestones.

## 1. Context

A guarded goal-entry **floor** and a legal-edge guard **bundle** (an *admission mask* that drops non-graph candidates + an *execution
guard* that blocks a non-edge, non-self executed move) were tested in GATE-FLOOR-INTERACTION (frozen design pushed before outcomes;
280 worlds; production-like hook state P; legal goal reaches, δ = 20, Bonferroni-3). With a **legacy** real store (trained
*unguarded*): the bundle improved legal reaches under the floor, **+28.1 [21.9, 34.6]** (PC2 IMPROVES; cold store +21.0); the floor
benefit persisted with the real store (+40.6 guard off, +33.3 guard on); the store × guard interaction was +7.1 [−2.0, 16.1]
(PC1 NO_RECOVERY, with the caveat that the whole deficit, 19.4, was below δ). Two questions remain: **Q1** does the bundle stay
beneficial when the training store is itself accumulated under the guard? **Q2** can the two components be separated enough to
decide whether one can be omitted?

## 2. Evidence, kept apart

**FACT — structure.** The two pinned guard lines are independent: ADMIT calls `__GFGUARD__.admit(...)` (the object decides) and EXEC
reads `__GFGUARD__.on`; so a **driver-level flag pair** (`maskOn` → `admit`, `on` → EXEC) separates the components **with the tree
and its hash pins unchanged**. `window.lastReasoning` is never cleared at HEAD (static invariant pinned): a *stale* reasoning
(`reasoning.from` ≠ the agent's position) can be executed after a reset.

**FACT — development calibration (XFER-1 dev worlds, floor ON, design input only).**
Non-graph goal resets by origin, 8 worlds, cold store: unguarded **60.9 = 25.8 stale + 35.1 non-edge decisions**; mask-only **30.4 =
30.4 stale + 0 decisions**. Six cells, 30 worlds, REAL stores, per-session means (legal / non-graph / blocked): U_off 420.5 / 125.2 / 0;
U_mask **469.0** / 30.9 / 0; U_exec **326.5** / 0 / **448.8**; U_both 460.9 / 0 / 31.4; G_off 428.4 / 124.2 / 0; G_both 450.2 / 0 /
32.1 (U = store trained unguarded, G = trained under the bundle, floor off in both).

| contrast (legal; n = 30; mean [95 % CI]; SD) | |
|---|---|
| retrofit U_both − U_off (replicates the frozen block) | +40.4 [22.9, 57.8]; 50.3 |
| **scope** G_both − U_both | **−10.7 [−30.8, 8.9]**; 57.1 |
| **package** G_both − U_off | **+29.7 [2.6, 54.7]**; 74.7 |
| mask-only U_mask − U_off | +48.5 [31.1, 66.5]; 50.4 |
| **exec-only** U_exec − U_off | **−94.0 [−114.7, −72.1]**; 59.2 |
| **shortfall of mask-only vs bundle** U_both − U_mask | **−8.1 [−17.8, 2.1]**; 28.5 |
| clean store, no runtime guard G_off − U_off (mechanistic) | +7.9 [−17.5, 32.3]; 70.6 |

Structure (30 worlds): bundle and exec-only cells → 0 non-graph resets; mask-only → 0 non-edge decisions; guard-off → inert counters;
integrity 180/180. **Guard-trained stores still contain non-graph consecutive pairs: 25.8 per store versus 100.6 unguarded** (7.8 vs
40.6 terminal jump-into-goal episodes), although every guard-training session had 0 non-graph resets. Store sizes comparable
(episodes 229.9 vs 236.2).

**INFERENCE (hypotheses).** (1) The mask is necessary and exec-only is harmful: it refuses 394 non-graph decisions per session
(449 blocked ticks, 30 % of calls) which are evidently re-decided. (2) The components close **different channels**: the mask the
decision channel, the execution guard the *only* stale channel; in legal reaches mask-only is not worse than the bundle, the bundle
adds completeness (0 illegal executions) at ≈ 31 blocked ticks. (3) Training scope looks neutral at n = 30. (4) A source-level fix
of the stale channel (clearing the reasoning at resets) is an untested alternative to the execution guard.

**UNKNOWN.** Why guard-trained stores keep non-graph pairs; component attribution when the *store* is trained under a component;
floor-in-training; whether the dev signs hold at n = 280; everything beyond the M7 bounds.

## 3. Candidate designs (paired by world; hook state P; floor ON at test; stores trained floor OFF)

| design | cells | trainings | sessions / world (n = 280) | supports | cannot support |
|---|---|---|---|---|---|
| E | U_off, G_both | 2 | 4 (1,120) | package only | scope vs runtime guard; components |
| A | U_off, U_both, G_both | 2 | 5 (1,400) | Q1 | Q2 |
| B | U_off, U_mask, U_exec, U_both | 1 | 5 (1,400) | Q2 | Q1 |
| **C (proposed)** | U_off, U_mask, U_exec, U_both, G_both | 2 | 7 (**1,960**) | Q1 and Q2, shared cells | component × scope; floor-in-training |
| C′ | C without U_exec | 2 | 6 (1,680) | Q1; omission of the exec guard only | "the mask cannot be omitted" (confirmatory) |
| D | {U, G} × {off, mask, exec, both} | 2 | 10 (2,800) | + component × scope | nothing asked |

A then B separately cost 2,800 sessions; C shares two cells. G_off is excluded everywhere (not a production scenario; dev null).

## 4. The proposed design C

Per world: two **independently trained** cold stores from the same world, configuration and training seed — **U** (guard off) and **G**
(bundle on) — floor off in training. Each store is **shared by every test cell that uses it** (U by four cells, G by one); one test
seed and configuration for all five cells. Test cells: U_off, U_both, G_both, U_mask (mask only), U_exec (exec only, a diagnostic).
280 fresh worlds (70 per goal 8/12/16/19), 2 training + 5 test sessions = **1,960 sessions**. Not shared across regimes (that removes
the manipulation); not trained per cell (that adds training noise to the component contrasts, which compare cells on one store).

## 5. Estimands, labels, decisions (legal reaches primary; δ = 20; paired percentile bootstrap, 10,000, fixed seed)

Primary family at **Bonferroni-3 (98.33 %)**: **PS1 scope** Y(G,both) − Y(U,both): SCOPE_BENEFIT (lb ≥ δ) / SCOPE_HARM (ub ≤ −δ) /
SCOPE_NEUTRAL (inside ±δ) / INCONCLUSIVE. **PS2 package** Y(G,both) − Y(U,off): PACKAGE_IMPROVES / HARMS / NEUTRAL / INCONCLUSIVE.
**PS3 exec omission (performance)** σ_M = Y(U,both) − Y(U,mask): MASK_SUFFICES (ub < δ) / MASK_SUPERIOR (ub ≤ −δ) / MASK_FALLS_SHORT
(lb ≥ δ) / INCONCLUSIVE. Outside the family (unadjusted 95 %): **D1** σ_X = Y(U,both) − Y(U,exec): MASK_NECESSARY (lb ≥ δ);
descriptive: stale share of mask-only non-graph resets (X1), store diagnostics, per-goal versions. **Completeness is a product
decision, not a statistical claim:** MASK_SUFFICES leaves ≈ 31 stale-channel non-graph resets per session.
Non-graph and total resets are reported separately everywhere.

Decisions: PS2 = PACKAGE_IMPROVES ∧ PS1 ≠ SCOPE_HARM ∧ no harm flag ∧ instruments → a production-design *specification* is
justified (PS1 = NEUTRAL → the guard need not predate the store; BENEFIT → from the first run). PS3 ∈ {SUFFICES, SUPERIOR} ∧ D1 =
NECESSARY → mask-only is performance-sufficient (owner must accept the residual). **Falsifiers:** SCOPE_NEUTRAL falsifies "training
under the guard changes the yield by ≥ δ"; MASK_SUFFICES/SUPERIOR falsifies "the exec guard contributes ≥ δ beyond the mask";
D1 ≠ NECESSARY falsifies "the mask cannot be omitted"; X1 < 90 % falsifies "the stale channel is what the mask leaves behind".

## 6. Validity gates and checks

I1 condition integrity P (all sessions). I2 floor audit (all test sessions). **I3 guard completeness per cell type** (bundle: 0 non-graph
resets / executed moves / admitted candidates; mask: 0 non-graph decisions and decision-origin resets, masked > 0, blocked = 0; exec: 0
non-graph resets, masked = 0, blocked > 0; off: masked = blocked = 0; G training: bundle completeness). **I4 default-off neutrality +
mode isolation** (gate level; each flag reaches only its own line; tree pin unchanged). I5 training fidelity (G records: bundle on,
floor off; U: guard off; same training seed). I6 retrofit replicate (lb > 0). I7 pairing / store identity. I8 store diagnostics, FLAG if
the G store's non-graph pair share exceeds the U store's. Per-goal HARM flags (PS1, PS2 wholly below 0; σ_M lb ≥ δ). Candidate-selection
diagnostics with two flags (blocked share > 5 % in bundle/mask cells; graph-admitted count changed > 5 %).
**Training-store confounding:** U and G differ in content *and* size; PS1/PS2 are the **total effect of the training regime**;
size/content/non-graph-pair diagnostics are recorded for every world and checked descriptively against per-world PS1 (no mediation claim).

## 7. Sample size, multiplicity, stopping

n ≥ ((z₁₋α/2 + z₀.₈₀)·SD/20)², decisive α = 0.05/3, dev SDs, 25 % inflation. PS1: SD 57.1 → n 86 (134 inflated), MDE at 280 = 11.0;
PS2: 74.7 → 147 (229), 14.4; PS3: 28.5 → 22 (34), 5.5; D1 (unadjusted): 75.4 → 112 (175), 12.6. **n = 280** covers all with
inflation and keeps 70 per goal. Assumptions: SDs are n = 30 point estimates (SE ≈ 13 %), independent worlds, normal-approximation sizing
of a bootstrap analysis. **Fixed stopping:** all 280 worlds × cells; no interim look, extension, optional stopping or outcome-based
exclusion; a failed session (incl. an integrity/completeness violation) retried once then the world excluded; > 10 % excluded → INVALID;
no parameter chosen from the new block.

## 8. Claim limits

State P; 150-tick cap; deterministic replay; legacy stale-keyed credit; one cold 1,500-call training session per store, floor off in
training; training under the **bundle** only (component-trained stores untested); components tested on legacy stores; Phase I, 1,500
calls, goals {8, 12, 16, 19}. Not production equivalence/readiness, routing capability or cognition.

## 9. Questions

1. **Intervention fidelity.** Is a driver-level flag pair on the pinned lines a faithful "mask-only" / "exec-only"? Is exec-only (block
   without masking) a fair component or a strawman, given that refused decisions are re-decided and burn ticks? Would a fairer exec-only
   exist (e.g. choose the next-best legal candidate), and is that still the "execution guard"?
2. **Training-store confounding.** Is the total effect of the training regime the right estimand for Q1? Is a store-matched control
   (equal episodes / equal non-graph pairs) required? How should the unexplained residual non-graph pairs in G stores be treated?
3. **Component attribution.** Do PS3 + D1 suffice to decide omission of either component? Is separating performance from completeness
   (a product decision) defensible, or should residual stale-channel resets be a primary criterion?
4. **Design choice.** Is C the smallest design for the two decisions, or are C′ / A+B / E enough? Is U_exec worth 280 sessions?
5. **Power and margin.** Is n = 280 with a 25 % SD inflation adequate from n = 30 development SDs; is δ = 20 right for declaring scope
   "neutral"?
6. **Multiplicity.** Is the family {PS1, PS2, PS3} at Bonferroni-3, with D1 and X1 outside it, sound?
7. **Claim scope.** Anything over- or under-claimed (bundle vs component wording, floor-in-training deferral, M7 limits)?

## 10. Answer format

Per question: `AGREE` / `AGREE WITH CLAIM LIMIT: <text>` / `OBJECT: <specific, minimal correction>`. Then at most three numbered
**required** corrections (what, why, how small), then one verdict: `PASS` / `PASS WITH CLAIM LIMITS` / `LIMITED CORRECTION` /
`BLOCK`. Label anything not required `OPTIONAL`.
